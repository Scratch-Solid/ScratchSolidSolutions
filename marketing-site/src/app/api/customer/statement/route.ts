export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withRateLimit, rateLimits } from '@/lib/middleware';
import { getCustomerStatementPdf, findOrCreateContact } from '@/lib/zoho';
import { getDb } from '@/lib/db';

export async function GET(request: NextRequest) {
  // Rate limiting
  const rateLimitResult = await withRateLimit(request, rateLimits.standard);
  if (rateLimitResult && !rateLimitResult.success) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      { status: 429 }
    );
  }

  try {
    // Get auth token from header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const db = await getDb();

    if (!db) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    // Get user from token (simplified - in production use proper JWT verification)
    const user = await db.prepare(
      `SELECT id, email, name, phone, zoho_contact_id FROM users WHERE email = ?`
    ).bind(token).first() as {
      id: number;
      email: string;
      name: string;
      phone: string;
      zoho_contact_id: string | null;
    } | null;

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get query parameters for date range
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Ensure user has Zoho contact ID
    let contactId: string | null = user.zoho_contact_id;
    if (!contactId) {
      // Create or find Zoho contact
      contactId = await findOrCreateContact(user.name, user.email, user.phone || '');
      if (contactId) {
        await db.prepare(
          `UPDATE users SET zoho_contact_id = ? WHERE id = ?`
        ).bind(contactId, user.id).run();
      }
    }

    if (!contactId) {
      return NextResponse.json({ error: 'Failed to get Zoho contact' }, { status: 500 });
    }

    // Get statement PDF from Zoho
    try {
      const zohoPdf = await getCustomerStatementPdf(contactId);
      const pdfBuffer = await zohoPdf.arrayBuffer();
      
      return new NextResponse(pdfBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="Statement-${user.email}.pdf"`,
        },
      });
    } catch (zohoError) {
      console.error('Zoho statement PDF fetch failed:', zohoError);
      return NextResponse.json(
        { error: 'Failed to retrieve statement PDF' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Statement download error:', error);
    return NextResponse.json(
      { error: 'Failed to download statement' },
      { status: 500 }
    );
  }
}
