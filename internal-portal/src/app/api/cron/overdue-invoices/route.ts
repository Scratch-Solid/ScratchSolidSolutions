export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { cancelOverdueInvoice, getInvoiceStatus } from '@/lib/zoho';

export async function POST(request: NextRequest) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const db = await getDb();

    // Get all bookings with Zoho invoices that are pending or sent
    const bookingsResult = await db.prepare(
      `SELECT id, zoho_invoice_id, created_at FROM bookings 
       WHERE zoho_invoice_id IS NOT NULL 
       AND zoho_invoice_id != ''
       AND status IN ('confirmed', 'in_progress', 'completed')`
    ).all();
    
    const bookings = bookingsResult.results as Array<{
      id: number;
      zoho_invoice_id: string;
      created_at: string;
    }>;

    const overdueThreshold = 30; // 30 days
    const cancelledCount = { value: 0 };

    for (const booking of bookings) {
      try {
        // Check invoice status from Zoho
        const statusResult = await getInvoiceStatus(booking.zoho_invoice_id) as { invoice?: { status: string } };
        
        if (statusResult.invoice && statusResult.invoice.status === 'overdue') {
          // Check if invoice is overdue by more than threshold days
          const createdDate = new Date(booking.created_at);
          const now = new Date();
          const daysOverdue = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));

          if (daysOverdue > overdueThreshold) {
            // Cancel overdue invoice
            await cancelOverdueInvoice(booking.zoho_invoice_id);
            cancelledCount.value++;
            
            // Update booking status
            await db.prepare(
              `UPDATE bookings SET status = 'cancelled', updated_at = datetime('now') WHERE id = ?`
            ).bind(booking.id).run();
          }
        }
      } catch (zohoError) {
        console.error(`Failed to process invoice ${booking.zoho_invoice_id}:`, zohoError);
        // Continue with next booking
      }
    }

    return NextResponse.json({
      success: true,
      processed: bookings.length,
      cancelled: cancelledCount.value,
    });

  } catch (error) {
    console.error('Overdue invoice management error:', error);
    return NextResponse.json(
      { error: `Failed to process overdue invoices: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}
