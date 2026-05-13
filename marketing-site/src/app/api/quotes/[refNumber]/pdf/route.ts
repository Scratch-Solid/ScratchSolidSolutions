export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(
  request: NextRequest,
  { params }: { params: { refNumber: string } }
) {
  try {
    const db = await getDb();
    if (!db) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

    const refNumber = params.refNumber;

    // Fetch quote request details
    const quote = await db.prepare(
      `SELECT * FROM quote_requests WHERE ref_number = ?`
    ).bind(refNumber).first();

    if (!quote) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
    }

    const q = quote as Record<string, unknown>;

    // Generate HTML for PDF
    const html = generateQuoteHTML(q);

    // Return HTML that can be converted to PDF
    return NextResponse.json({
      success: true,
      html,
      quote: q
    });

  } catch (error) {
    console.error('Error generating quote PDF:', error);
    return NextResponse.json(
      { error: 'Failed to generate PDF' },
      { status: 500 }
    );
  }
}

function generateQuoteHTML(quote: Record<string, unknown>): string {
  const discountAmount = quote.discount_amount as number;
  const finalPrice = quote.final_price as number;
  const baselinePrice = quote.baseline_price as number;
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Quote ${quote.ref_number}</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 40px;
      color: #333;
    }
    .header {
      text-align: center;
      margin-bottom: 40px;
      border-bottom: 2px solid #1e40af;
      padding-bottom: 20px;
    }
    .header h1 {
      color: #1e40af;
      margin: 0;
      font-size: 32px;
    }
    .header p {
      color: #666;
      margin: 5px 0 0 0;
    }
    .quote-details {
      background: #f8fafc;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 30px;
    }
    .quote-details h2 {
      margin: 0 0 15px 0;
      color: #1e40af;
    }
    .detail-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 10px;
      padding: 8px 0;
      border-bottom: 1px solid #e2e8f0;
    }
    .detail-row:last-child {
      border-bottom: none;
    }
    .detail-label {
      font-weight: 600;
      color: #475569;
    }
    .detail-value {
      color: #1e293b;
    }
    .pricing-section {
      background: #f0f9ff;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 30px;
    }
    .pricing-section h2 {
      margin: 0 0 15px 0;
      color: #1e40af;
    }
    .price-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 10px;
      padding: 8px 0;
    }
    .price-row.final {
      font-size: 24px;
      font-weight: bold;
      color: #1e40af;
      border-top: 2px solid #1e40af;
      padding-top: 15px;
      margin-top: 15px;
    }
    .footer {
      text-align: center;
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e2e8f0;
      color: #666;
      font-size: 14px;
    }
    .status {
      display: inline-block;
      padding: 6px 12px;
      border-radius: 4px;
      font-weight: bold;
      text-transform: uppercase;
      font-size: 12px;
    }
    .status-pending {
      background: #fef3c7;
      color: #92400e;
    }
    .status-sent {
      background: #dbeafe;
      color: #1e40af;
    }
    .status-accepted {
      background: #dcfce7;
      color: #166534;
    }
    .status-declined {
      background: #fee2e2;
      color: #991b1b;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Scratch Solid Solutions</h1>
    <p>Professional Cleaning Services Quote</p>
  </div>

  <div class="quote-details">
    <h2>Quote Details</h2>
    <div class="detail-row">
      <span class="detail-label">Reference Number:</span>
      <span class="detail-value">${quote.ref_number}</span>
    </div>
    <div class="detail-row">
      <span class="detail-label">Customer Name:</span>
      <span class="detail-value">${quote.name}</span>
    </div>
    <div class="detail-row">
      <span class="detail-label">Email:</span>
      <span class="detail-value">${quote.email || 'N/A'}</span>
    </div>
    <div class="detail-row">
      <span class="detail-label">Phone:</span>
      <span class="detail-value">${quote.phone || 'N/A'}</span>
    </div>
    <div class="detail-row">
      <span class="detail-label">Service:</span>
      <span class="detail-value">${quote.service_name || 'Custom Service'}</span>
    </div>
    <div class="detail-row">
      <span class="detail-label">Status:</span>
      <span class="detail-value">
        <span class="status status-${quote.status}">${quote.status}</span>
      </span>
    </div>
    <div class="detail-row">
      <span class="detail-label">Date:</span>
      <span class="detail-value">${new Date(quote.created_at as string).toLocaleDateString()}</span>
    </div>
  </div>

  <div class="pricing-section">
    <h2>Pricing</h2>
    <div class="price-row">
      <span>Baseline Price:</span>
      <span>R${baselinePrice.toFixed(2)}</span>
    </div>
    ${discountAmount > 0 ? `
    <div class="price-row">
      <span>Discount:</span>
      <span style="color: #166534;">-R${discountAmount.toFixed(2)}</span>
    </div>
    ` : ''}
    <div class="price-row final">
      <span>Total:</span>
      <span>R${finalPrice.toFixed(2)}</span>
    </div>
  </div>

  ${quote.notes ? `
  <div style="background: #f8fafc; padding: 20px; border-radius: 8px;">
    <h2 style="margin: 0 0 15px 0; color: #1e40af;">Notes</h2>
    <p style="margin: 0; color: #475569;">${quote.notes}</p>
  </div>
  ` : ''}

  <div class="footer">
    <p>This quote is valid for 30 days from the date of issue.</p>
    <p>For questions, please contact us at info@scratchsolidsolutions.org</p>
    <p>Generated on ${new Date().toLocaleString()}</p>
  </div>
</body>
</html>
  `;
}
