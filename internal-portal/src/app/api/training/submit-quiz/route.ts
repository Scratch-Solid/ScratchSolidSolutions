export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { getTrainingDb, syncTrainingCompletion, activateUserAfterTraining } from '@/lib/db';
import { withAuth, withTracing, withSecurityHeaders, withCsrf } from '@/lib/middleware';

export async function POST(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['cleaner', 'admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { user } = authResult;

  // CSRF protection
  const csrfResult = await withCsrf(request);
  if (csrfResult) return withSecurityHeaders(csrfResult, traceId);

  const trainingDb = await getTrainingDb();
  if (!trainingDb) {
    return withSecurityHeaders(
      NextResponse.json({ error: 'Training database not available' }, { status: 500 }),
      traceId
    );
  }

  try {
    const body = await request.json() as {
      userId: string;
      moduleId: number;
      totalQuestions: number;
      correctAnswers: number;
    };

    const { userId, moduleId, totalQuestions, correctAnswers } = body;

    if (!userId || !moduleId || !totalQuestions || correctAnswers === undefined) {
      return withSecurityHeaders(
        NextResponse.json({ error: 'Missing required fields: userId, moduleId, totalQuestions, correctAnswers' }, { status: 400 }),
        traceId
      );
    }

    // Calculate score percentage
    const scorePercentage = (correctAnswers / totalQuestions) * 100;
    const isPassed = scorePercentage === 100 ? 1 : 0; // Absolute 100% mastery requirement

    const now = new Date();
    const currentTimestamp = now.toISOString();

    // Log the attempt metrics in D1 for audit records
    await trainingDb.prepare(
      `INSERT INTO training_quiz_attempts (user_id, module_id, score_percentage, passed, attempted_at) 
       VALUES (?, ?, ?, ?, ?)`
    ).bind(userId, moduleId, scorePercentage, isPassed, currentTimestamp).run();

    if (isPassed === 1) {
      if (moduleId < 5) {
        // Progress to next day and activate the 24-hour lock out
        const nextUnlock = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
        
        await trainingDb.prepare(
          `UPDATE employee_training_progress 
           SET current_module_id = current_module_id + 1, 
               last_completed_at = ?, 
               next_unlock_at = ?,
               updated_at = ?
           WHERE user_id = ?`
        ).bind(currentTimestamp, nextUnlock, currentTimestamp, userId).run();

        return withSecurityHeaders(
          NextResponse.json({ 
            status: "passed", 
            message: "Excellent! Module cleared. Your next module unlocks in 24 hours.",
            nextUnlock: nextUnlock
          }),
          traceId
        );

      } else if (moduleId === 5) {
        // Final Milestone Reached: Transition user status to 'Completed' (Active)
        const certHash = crypto.randomUUID().split('-')[0].toUpperCase();
        
        await trainingDb.prepare(
          `UPDATE employee_training_progress 
           SET training_status = 'Completed', 
               last_completed_at = ?, 
               next_unlock_at = NULL,
               certificate_url = ?,
               updated_at = ?
           WHERE user_id = ?`
        ).bind(currentTimestamp, `VERIFIED-${certHash}`, currentTimestamp, userId).run();

        // Cross-database sync: Update main database
        const ip = request.headers.get('x-forwarded-for') || undefined;
        const userAgent = request.headers.get('user-agent') || undefined;
        
        await syncTrainingCompletion(userId, `VERIFIED-${certHash}`, ip, userAgent);
        await activateUserAfterTraining(userId, ip, userAgent);
        
        return withSecurityHeaders(
          NextResponse.json({ 
            status: "certified", 
            message: "All modules cleared successfully! Triggering celebrations.",
            certHash: `VERIFIED-${certHash}`,
            completionDate: now.toLocaleDateString()
          }),
          traceId
        );
      }
    }

    // Fallthrough state for failed attempts (anything less than 100%)
    return withSecurityHeaders(
      NextResponse.json({ 
        status: "failed", 
        message: "Review the module content and try again! Mastery requires 100% correct answers." 
      }),
      traceId
    );

  } catch (error) {
    console.error('Quiz submission error:', error);
    return withSecurityHeaders(
      NextResponse.json({ error: 'Failed to submit quiz' }, { status: 500 }),
      traceId
    );
  }
}
