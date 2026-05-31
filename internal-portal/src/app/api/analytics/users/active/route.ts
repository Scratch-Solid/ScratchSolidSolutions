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

    // Get active staff (cleaners who have logged in or had bookings in the time range)
    const activeStaff = await db.prepare(
      `SELECT COUNT(DISTINCT u.id) as count 
       FROM users u 
       LEFT JOIN bookings b ON u.id = b.cleaner_id 
       WHERE u.role = 'cleaner' 
       AND u.deleted = 0 
       AND (u.last_login >= ? OR b.booking_date >= ?)`
    ).bind(monthAgoStr, monthAgoStr).first();

    // Get active clients (clients who have logged in or had bookings in the time range)
    const activeClients = await db.prepare(
      `SELECT COUNT(DISTINCT u.id) as count 
       FROM users u 
       LEFT JOIN bookings b ON u.id = b.user_id 
       WHERE u.role = 'client' 
       AND u.deleted = 0 
       AND (u.last_login >= ? OR b.booking_date >= ?)`
    ).bind(monthAgoStr, monthAgoStr).first();

    // Get total staff count
    const totalStaff = await db.prepare(
      'SELECT COUNT(*) as count FROM users WHERE role = "cleaner" AND deleted = 0'
    ).first();

    // Get total clients count
    const totalClients = await db.prepare(
      'SELECT COUNT(*) as count FROM users WHERE role = "client" AND deleted = 0'
    ).first();

    // Get total admin count
    const totalAdmins = await db.prepare(
      'SELECT COUNT(*) as count FROM users WHERE role = "admin" AND deleted = 0'
    ).first();

    // Get users by role
    const usersByRole = await db.prepare(
      'SELECT role, COUNT(*) as count FROM users WHERE deleted = 0 GROUP BY role'
    ).all();

    // Get users logged in today
    const usersLoggedInToday = await db.prepare(
      `SELECT COUNT(*) as count FROM users 
       WHERE DATE(last_login) = ? AND deleted = 0`
    ).bind(todayStr).first();

    // Get users logged in this week
    const usersLoggedInWeek = await db.prepare(
      `SELECT COUNT(*) as count FROM users 
       WHERE DATE(last_login) >= ? AND DATE(last_login) <= ? AND deleted = 0`
    ).bind(weekAgoStr, todayStr).first();

    // Get users logged in this month
    const usersLoggedInMonth = await db.prepare(
      `SELECT COUNT(*) as count FROM users 
       WHERE DATE(last_login) >= ? AND DATE(last_login) <= ? AND deleted = 0`
    ).bind(monthAgoStr, todayStr).first();

    const response = NextResponse.json({
      success: true,
      data: {
        active_staff: (activeStaff as any)?.count || 0,
        active_clients: (activeClients as any)?.count || 0,
        total_staff: (totalStaff as any)?.count || 0,
        total_clients: (totalClients as any)?.count || 0,
        total_admins: (totalAdmins as any)?.count || 0,
        users_logged_in_today: (usersLoggedInToday as any)?.count || 0,
        users_logged_in_week: (usersLoggedInWeek as any)?.count || 0,
        users_logged_in_month: (usersLoggedInMonth as any)?.count || 0,
        by_role: (usersByRole.results || []).map((row: any) => ({
          role: row.role,
          count: row.count
        }))
      }
    });
    response.headers.set('Cache-Control', 'private, max-age=60');
    return withSecurityHeaders(response, traceId);

  } catch (error) {
    console.error('Active users analytics error:', error);
    const response = NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch active users analytics',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        suggestion: 'Please try again later or contact support if the issue persists'
      }
    }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}
