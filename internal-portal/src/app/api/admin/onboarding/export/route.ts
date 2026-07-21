export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withSecurityHeaders, withTracing, withCsrf } from '@/lib/middleware';

export async function GET(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;

  const csrfResponse = await withCsrf(request);
  if (csrfResponse) return withSecurityHeaders(csrfResponse, traceId);

  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'csv';
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    let dateFilter = '';
    const params: any[] = [];

    if (startDate && endDate) {
      dateFilter = 'AND u.created_at BETWEEN ? AND ?';
      params.push(startDate, endDate);
    }

    const query = await db.prepare(`
      SELECT 
        u.id,
        u.name,
        u.phone,
        u.email,
        u.onboarding_stage,
        u.created_at,
        s.department,
        s.pool_type,
        s.training_completed,
        s.contract_url
      FROM users u
      LEFT JOIN staff s ON u.id = s.user_id
      WHERE u.onboarding_stage IS NOT NULL
        ${dateFilter}
      ORDER BY u.created_at DESC
    `).bind(...params).all();

    const data = query.results || [];

    if (format === 'csv') {
      const headers = ['ID', 'Name', 'Phone', 'Email', 'Stage', 'Department', 'Pool Type', 'Trained', 'Contract URL', 'Created At'];
      const csvRows = [
        headers.join(','),
        ...data.map((row: any) => [
          row.id,
          `"${row.name || ''}"`,
          `"${row.phone || ''}"`,
          `"${row.email || ''}"`,
          row.onboarding_stage,
          `"${row.department || ''}"`,
          row.pool_type || '',
          row.training_completed ? 'Yes' : 'No',
          `"${row.contract_url || ''}"`,
          row.created_at
        ].join(','))
      ];

      const csvContent = csvRows.join('\n');
      
      return withSecurityHeaders(
        new NextResponse(csvContent, {
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': 'attachment; filename="onboarding_export.csv"'
          }
        }),
        traceId
      );
    }

    // JSON format
    return withSecurityHeaders(NextResponse.json({ data }), traceId);
  } catch (error) {
    console.error('Export error:', error);
    return withSecurityHeaders(NextResponse.json({ error: `Failed to export data: ${error instanceof Error ? error.message : 'Unknown error'}` }, { status: 500 }), traceId);
  }
}
