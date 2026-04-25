import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { withAuth, withTracing, withSecurityHeaders } from '@/lib/middleware';
import { logger } from '@/lib/logger';

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['business', 'admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;

  try {
    const contractId = parseInt(params.id);

    // Fetch contract from database
    const contract = await db.prepare(
      `SELECT * FROM contracts WHERE id = ?`
    ).bind(contractId).first();

    if (!contract) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 });
    }

    // Generate PDF content (simple text-based PDF generation)
    // In production, you might use a library like jsPDF or PDFKit
    const contractData = contract as any;
    const pdfContent = `
SCRATCH SOLID SOLUTIONS - SERVICE CONTRACT

Contract ID: ${contractData.id}
Business Name: ${contractData.business_name || 'N/A'}
Contract Type: ${contractData.contract_type || 'Standard'}
Rate per Hour: R${contractData.rate_per_hour || 0}
Weekend Rate Multiplier: ${contractData.weekend_rate_multiplier || 1.5}x

Start Date: ${contractData.start_date || 'N/A'}
End Date: ${contractData.end_date || 'N/A'}
Status: ${contractData.status || 'Active'}

Terms and Conditions:
${contractData.terms || 'Standard terms apply'}

Weekend Work Required: ${contractData.weekend_required ? 'Yes' : 'No'}

This contract is immutable and read-only as per agreement.
Generated on: ${new Date().toISOString()}
    `.trim();

    // Return as text/plain for now (in production, generate actual PDF)
    return new NextResponse(pdfContent, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="contract-${contractId}.pdf"`,
      },
    });
  } catch (error) {
    logger.error('Error exporting contract', error as Error);
    const response = NextResponse.json({ error: 'Failed to export contract' }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}
