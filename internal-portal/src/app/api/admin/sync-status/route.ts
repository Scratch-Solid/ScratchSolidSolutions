export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { getDb, getTrainingDb } from '@/lib/db';
import { withAuth, withTracing, withSecurityHeaders } from '@/lib/middleware';

export async function GET(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;

  const trainingDb = await getTrainingDb();
  if (!trainingDb) {
    return withSecurityHeaders(
      NextResponse.json({ error: 'Training database not available' }, { status: 500 }),
      traceId
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (userId) {
      // Get sync status for a specific user
      const user = await db.prepare('SELECT id, onboarding_stage FROM users WHERE id = ?').bind(parseInt(userId)).first();
      if (!user) {
        return withSecurityHeaders(
          NextResponse.json({ error: 'User not found' }, { status: 404 }),
          traceId
        );
      }

      const staff = await db.prepare('SELECT training_completed, onboarding_stage FROM staff WHERE user_id = ?').bind(parseInt(userId)).first();
      const trainingProgress = await trainingDb.prepare('SELECT training_status, certificate_url FROM employee_training_progress WHERE user_id = ?').bind(userId).first();

      return withSecurityHeaders(
        NextResponse.json({
          userId: parseInt(userId),
          mainDb: {
            onboarding_stage: (user as any).onboarding_stage,
            staff_training_completed: staff ? (staff as any).training_completed : null,
            staff_onboarding_stage: staff ? (staff as any).onboarding_stage : null
          },
          trainingDb: {
            training_status: trainingProgress ? (trainingProgress as any).training_status : null,
            certificate_url: trainingProgress ? (trainingProgress as any).certificate_url : null
          },
          syncStatus: determineSyncStatus(
            (user as any).onboarding_stage,
            staff ? (staff as any).training_completed : null,
            trainingProgress ? (trainingProgress as any).training_status : null
          )
        }),
        traceId
      );
    } else {
      // Get overall sync status for all users
      const users = await db.prepare('SELECT id, onboarding_stage FROM users WHERE role = ?').bind('cleaner').all();
      const staffRecords = await db.prepare('SELECT user_id, training_completed, onboarding_stage FROM staff').all();
      
      const staffMap = new Map();
      (staffRecords.results || []).forEach((staff: any) => {
        staffMap.set(staff.user_id, staff);
      });

      const syncStatuses = [];
      for (const user of (users.results || [])) {
        const staff = staffMap.get((user as any).user_id);
        const trainingProgress = await trainingDb.prepare('SELECT training_status, certificate_url FROM employee_training_progress WHERE user_id = ?').bind(String((user as any).user_id)).first();
        
        syncStatuses.push({
          userId: (user as any).user_id,
          mainDb: {
            onboarding_stage: (user as any).onboarding_stage,
            staff_training_completed: staff ? staff.training_completed : null,
            staff_onboarding_stage: staff ? staff.onboarding_stage : null
          },
          trainingDb: {
            training_status: trainingProgress ? (trainingProgress as any).training_status : null,
            certificate_url: trainingProgress ? (trainingProgress as any).certificate_url : null
          },
          syncStatus: determineSyncStatus(
            (user as any).onboarding_stage,
            staff ? staff.training_completed : null,
            trainingProgress ? (trainingProgress as any).training_status : null
          )
        });
      }

      const summary = {
        total: syncStatuses.length,
        synced: syncStatuses.filter((s: any) => s.syncStatus === 'synced').length,
        outOfSync: syncStatuses.filter((s: any) => s.syncStatus === 'out_of_sync').length,
        pending: syncStatuses.filter((s: any) => s.syncStatus === 'pending').length
      };

      return withSecurityHeaders(
        NextResponse.json({
          summary,
          users: syncStatuses
        }),
        traceId
      );
    }
  } catch (error) {
    console.error('Sync status error:', error);
    return withSecurityHeaders(
      NextResponse.json({ error: `Failed to get sync status: ${error instanceof Error ? error.message : 'Unknown error'}` }, { status: 500 }),
      traceId
    );
  }
}

function determineSyncStatus(mainStage: string, staffTrainingCompleted: number | null, trainingStatus: string | null): string {
  // If training is completed in training DB but not synced to main DB
  if (trainingStatus === 'Completed' && mainStage !== 'active') {
    return 'out_of_sync';
  }
  
  // If training is completed in training DB and synced to main DB
  if (trainingStatus === 'Completed' && mainStage === 'active') {
    return 'synced';
  }
  
  // If training is in progress
  if (trainingStatus === 'In Progress' || trainingStatus === 'Not Started') {
    return 'pending';
  }
  
  // Default to pending if unclear
  return 'pending';
}
