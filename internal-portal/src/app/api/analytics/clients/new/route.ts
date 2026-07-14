export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withTracing, withSecurityHeaders } from '@/lib/middleware';

export async function GET(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;

  try {
    const { searchParams } = new URL(request.url);
    const dateRange = searchParams.get('dateRange') || '30'; // default to last 30 days

    // Calculate date filters
    const daysAgo = parseInt(dateRange);
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const weekAgoStr = weekAgo.toISOString().split('T')[0];
    
    const monthAgo = new Date(today);
    monthAgo.setDate(monthAgo.getDate() - 30);
    const monthAgoStr = monthAgo.toISOString().split('T')[0];

    // Get total clients
    const totalClients = await db.prepare(
      'SELECT COUNT(*) as count FROM users WHERE role = "client" AND deleted = 0'
    ).first();

    // Get new clients today
    const clientsToday = await db.prepare(
      `SELECT COUNT(*) as count FROM users 
       WHERE role = 'client' AND DATE(created_at) = ? AND deleted = 0`
    ).bind(todayStr).first();

    // Get new clients this week
    const clientsWeek = await db.prepare(
      `SELECT COUNT(*) as count FROM users 
       WHERE role = 'client' AND DATE(created_at) >= ? AND DATE(created_at) <= ? AND deleted = 0`
    ).bind(weekAgoStr, todayStr).first();

    // Get new clients this month
    const clientsMonth = await db.prepare(
      `SELECT COUNT(*) as count FROM users 
       WHERE role = 'client' AND DATE(created_at) >= ? AND DATE(created_at) <= ? AND deleted = 0`
    ).bind(monthAgoStr, todayStr).first();

    // Get client type breakdown (individual vs business)
    const clientsByType = await db.prepare(
      `SELECT 
         CASE 
           WHEN department = 'business' OR department LIKE '%business%' THEN 'business'
           ELSE 'individual'
         END as client_type,
         COUNT(*) as count 
       FROM users 
       WHERE role = 'client' AND deleted = 0 
       GROUP BY client_type`
    ).all();

    // Get new clients by type this month
    const newClientsByType = await db.prepare(
      `SELECT 
         CASE 
           WHEN department = 'business' OR department LIKE '%business%' THEN 'business'
           ELSE 'individual'
         END as client_type,
         COUNT(*) as count 
       FROM users 
       WHERE role = 'client' AND DATE(created_at) >= ? AND DATE(created_at) <= ? AND deleted = 0 
       GROUP BY client_type`
    ).bind(monthAgoStr, todayStr).all();

    const response = NextResponse.json({
      success: true,
      data: {
        total_clients: (totalClients as any)?.count || 0,
        new_clients_today: (clientsToday as any)?.count || 0,
        new_clients_week: (clientsWeek as any)?.count || 0,
        new_clients_month: (clientsMonth as any)?.count || 0,
        client_type_breakdown: (clientsByType.results || []).map((row: any) => ({
          client_type: row.client_type,
          count: row.count
        })),
        new_clients_by_type: (newClientsByType.results || []).map((row: any) => ({
          client_type: row.client_type,
          count: row.count
        }))
      }
    });
    response.headers.set('Cache-Control', 'private, max-age=60');
    return withSecurityHeaders(response, traceId);

  } catch (error) {
    console.error('New clients analytics error:', error);
    const response = NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: `Failed to fetch new clients analytics: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: {
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        suggestion: 'Please try again later or contact support if the issue persists'
      }
    }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}
