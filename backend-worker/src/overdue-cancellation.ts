/**
 * Overdue Cancellation Worker
 * Runs via Cloudflare Cron to check for overdue invoices and automatically cancel them
 * Creates credit notes for future bookings when cancellation occurs
 */

import { getDb } from '../lib/db';
import { cancelOverdueInvoice, createCreditNote, applyCreditNoteToInvoice } from '../lib/zoho';

interface Invoice {
  id: string;
  invoice_id: string;
  customer_id: string;
  total_amount: number;
  due_date: string;
  status: string;
}

const OVERDUE_DAYS = 7; // Invoice is overdue after 7 days past due date

export async function handleOverdueCancellations() {
  const db = await getDb();
  
  try {
    console.log('[Overdue Cancellation] Starting check...');
    
    // Get all bookings with pending payments that are overdue
    const overdueBookings = await db.prepare(`
      SELECT b.id, b.client_id, b.zoho_invoice_id, b.booking_date, p.created_at as payment_created_at
      FROM bookings b
      LEFT JOIN payments p ON b.id = p.booking_id
      WHERE b.zoho_invoice_id IS NOT NULL
      AND b.status NOT IN ('completed', 'cancelled')
      AND (p.status IS NULL OR p.status = 'pending')
      AND date(b.booking_date, '+' || ${OVERDUE_DAYS} || ' days') < date('now')
    `).all();
    
    console.log(`[Overdue Cancellation] Found ${overdueBookings.results?.length || 0} overdue bookings`);
    
    if (!overdueBookings.results || overdueBookings.results.length === 0) {
      return { success: true, cancelled: 0, credited: 0 };
    }
    
    let cancelledCount = 0;
    let creditedCount = 0;
    
    for (const booking of overdueBookings.results as any[]) {
      try {
        // Cancel the Zoho invoice
        if (booking.zoho_invoice_id) {
          await cancelOverdueInvoice(booking.zoho_invoice_id);
          console.log(`[Overdue Cancellation] Cancelled Zoho invoice: ${booking.zoho_invoice_id}`);
        }
        
        // Create credit note for the customer
        const creditNote = await createCreditNote(
          `CUST-${booking.client_id}`,
          [{
            item_id: 'cleaning-credit',
            name: 'Credit for Cancelled Booking',
            description: `Credit for cancelled booking #${booking.id} due to overdue payment`,
            quantity: 1,
            rate: booking.total_amount || 150,
          }],
          `OVERDUE-${booking.id}-${Date.now()}`
        );
        
        if (creditNote && creditNote.creditnote) {
          // Update booking with credit note reference
          await db.prepare(`
            UPDATE bookings 
            SET status = 'cancelled',
                pop_status = 'rejected',
                updated_at = datetime('now')
            WHERE id = ?
          `).bind(booking.id).run();
          
          // Store credit note reference in payments table
          await db.prepare(`
            INSERT INTO payments (user_id, booking_id, amount, method, status, created_at)
            VALUES (?, ?, ?, 'credit', 'credit_note_issued', datetime('now'))
          `).bind(booking.client_id, booking.id, booking.total_amount || 150).run();
          
          creditedCount++;
          cancelledCount++;
          console.log(`[Overdue Cancellation] Created credit note for booking #${booking.id}`);
        }
      } catch (error) {
        console.error(`[Overdue Cancellation] Failed to process booking #${booking.id}:`, error);
      }
    }
    
    console.log(`[Overdue Cancellation] Completed: ${cancelledCount} cancelled, ${creditedCount} credited`);
    
    return { success: true, cancelled: cancelledCount, credited: creditedCount };
  } catch (error) {
    console.error('[Overdue Cancellation] Error:', error);
    return { success: false, error: String(error) };
  }
}

// Cloudflare Worker entry point
export default {
  async scheduled(event: any, env: any, ctx: any) {
    await handleOverdueCancellations();
  }
};
