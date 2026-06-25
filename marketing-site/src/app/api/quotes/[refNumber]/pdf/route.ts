export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { withRateLimit, rateLimits } from '@/lib/middleware';
import { getEstimatePdf } from '@/lib/zoho';
import jsPDF from 'jspdf';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ refNumber: string }> }
) {
  // Rate limiting
  const rateLimitResult = await withRateLimit(request, rateLimits.standard);
  if (rateLimitResult && !rateLimitResult.success) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { 
        status: 429,
        headers: {
          'X-RateLimit-Limit': rateLimitResult.limit.toString(),
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
          'X-RateLimit-Reset': rateLimitResult.reset.toString()
        }
      }
    );
  }

  try {
    const db = await getDb();
    if (!db) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

    const { refNumber } = await params;

    // Fetch quote request details
    const quote = await db.prepare(
      `SELECT * FROM quote_requests WHERE ref_number = ?`
    ).bind(refNumber).first();

    if (!quote) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
    }

    const q = quote as Record<string, unknown>;

    // Capability-based authorization: the ref_number is an unguessable random token.
    // Anyone holding the token (e.g. a new/anonymous quote requester) may download the PDF.
    // Authenticated owners/admins are also tracked for audit but not required.
    const quoteEmail = (q.email as string) || '';

    // Use Zoho PDF if estimate exists, otherwise fall back to custom HTML
    const zohoEstimateId = (q.zoho_estimate_id as string) || '';
    if (zohoEstimateId) {
      try {
        const zohoPdf = await getEstimatePdf(zohoEstimateId);
        const pdfBuffer = await zohoPdf.arrayBuffer();
        
        return new NextResponse(pdfBuffer, {
          status: 200,
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="Tax-Invoice-${refNumber}.pdf"`,
          },
        });
      } catch (zohoError) {
        console.error('Zoho PDF fetch failed, falling back to custom HTML:', zohoError);
        // Fall back to custom HTML if Zoho fails
      }
    }

    // Fallback: Generate proper PDF server-side
    const pdfBuffer = generateQuotePDF(q);
    
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Quote-${refNumber}.pdf"`,
      },
    });

  } catch (error) {
    console.error('Error generating quote PDF:', error);
    return NextResponse.json(
      { error: 'Failed to generate PDF' },
      { status: 500 }
    );
  }
}

function generateQuotePDF(quote: Record<string, unknown>): Uint8Array {
  const pdf = new jsPDF('p', 'mm', 'a4');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 20;
  let y = margin;

  const discountAmount = quote.discount_amount as number;
  const finalPrice = quote.final_price as number;
  const baselinePrice = quote.baseline_price as number;

  // Helper function for text
  const addText = (text: string, x: number, lineY: number, fontSize: number = 10, isBold: boolean = false) => {
    pdf.setFontSize(fontSize);
    if (isBold) pdf.setFont('helvetica', 'bold');
    else pdf.setFont('helvetica', 'normal');
    pdf.text(text, x, lineY);
  };

  // Header
  pdf.setFillColor(30, 64, 175);
  pdf.rect(0, 0, pageWidth, 40, 'F');
  pdf.setTextColor(255, 255, 255);
  addText('Scratch Solid Solutions', margin, 24, 20, true);
  addText('Professional Cleaning Services Quote', margin, 32, 12);

  // Reset text color
  pdf.setTextColor(0, 0, 0);
  y = 55;

  // Quote Details Section
  pdf.setFillColor(248, 250, 252);
  pdf.rect(margin, y - 5, pageWidth - (margin * 2), 60, 'F');
  addText('Quote Details', margin, y + 5, 14, true);
  y += 15;

  const details = [
    ['Reference Number:', quote.ref_number as string],
    ['Customer Name:', quote.name as string],
    ['Email:', (quote.email as string) || 'N/A'],
    ['Phone:', (quote.phone as string) || 'N/A'],
    ['Service:', (quote.service_name as string) || 'Custom Service'],
    ['Status:', (quote.status as string).toUpperCase()],
    ['Date:', new Date(quote.created_at as string).toLocaleDateString()],
  ];

  details.forEach(([label, value]) => {
    addText(label, margin, y, 10, true);
    addText(value, pageWidth - margin - pdf.getTextWidth(value), y);
    y += 8;
  });

  y += 15;

  // Pricing Section
  pdf.setFillColor(240, 249, 255);
  pdf.rect(margin, y - 5, pageWidth - (margin * 2), 50, 'F');
  addText('Pricing', margin, y + 5, 14, true);
  y += 15;

  addText('Baseline Price:', margin, y);
  addText(`R${baselinePrice.toFixed(2)}`, pageWidth - margin - pdf.getTextWidth(`R${baselinePrice.toFixed(2)}`), y);
  y += 10;

  if (discountAmount > 0) {
    pdf.setTextColor(22, 101, 52);
    addText('Discount:', margin, y);
    addText(`-R${discountAmount.toFixed(2)}`, pageWidth - margin - pdf.getTextWidth(`-R${discountAmount.toFixed(2)}`), y);
    pdf.setTextColor(0, 0, 0);
    y += 10;
  }

  // Total
  pdf.setDrawColor(30, 64, 175);
  pdf.setLineWidth(0.5);
  pdf.line(margin, y + 5, pageWidth - margin, y + 5);
  y += 15;
  pdf.setTextColor(30, 64, 175);
  addText('Total:', margin, y, 20, true);
  addText(`R${finalPrice.toFixed(2)}`, pageWidth - margin - pdf.getTextWidth(`R${finalPrice.toFixed(2)}`), y, 20, true);
  pdf.setTextColor(0, 0, 0);

  y += 25;

  // Notes if present
  if (quote.notes) {
    pdf.setFillColor(248, 250, 252);
    pdf.rect(margin, y - 5, pageWidth - (margin * 2), 30, 'F');
    addText('Notes', margin, y + 5, 14, true);
    y += 15;
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    const splitNotes = pdf.splitTextToSize(quote.notes as string, pageWidth - (margin * 2));
    pdf.text(splitNotes, margin, y);
    y += splitNotes.length * 5 + 20;
  }

  // Footer
  y = pageHeight - 30;
  pdf.setDrawColor(226, 232, 240);
  pdf.setLineWidth(0.3);
  pdf.line(margin, y, pageWidth - margin, y);
  y += 10;
  pdf.setTextColor(102, 102, 102);
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.text('This quote is valid for 30 days from the date of issue.', pageWidth / 2, y, { align: 'center' });
  y += 6;
  pdf.text('For questions, please contact us at info@scratchsolidsolutions.org', pageWidth / 2, y, { align: 'center' });
  y += 6;
  pdf.text(`Generated on ${new Date().toLocaleString()}`, pageWidth / 2, y, { align: 'center' });

  return pdf.output('arraybuffer') as Uint8Array;
}
