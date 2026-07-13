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

  const authResult = await withAuth(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }
  const { user } = authResult;

  try {
    const db = await getDb();
    if (!db) {
      return NextResponse.json({ error: 'Database connection failed' }, { status: 500 });
    }

    const email = (user as any).email;
    if (!email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRecord = await db.prepare(
      `SELECT id, email, name, phone, zoho_contact_id FROM users WHERE email = ?`
    ).bind(email).first() as {
      id: number;
      email: string;
      name: string;
      phone: string;
      zoho_contact_id: string | null;
    } | null;

    if (!userRecord) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    let contactId: string | null = userRecord.zoho_contact_id;
    if (!contactId) {
      contactId = await findOrCreateContact(userRecord.name, userRecord.email, userRecord.phone || '');
      if (contactId) {
        await db.prepare(
          `UPDATE users SET zoho_contact_id = ? WHERE id = ?`
        ).bind(contactId, userRecord.id).run();
      }
    }

    if (!contactId) {
      return NextResponse.json({ error: 'Failed to get Zoho contact' }, { status: 500 });
    }

    try {
      const zohoPdf = await getCustomerStatementPdf(contactId);
      const pdfBuffer = await zohoPdf.arrayBuffer();

      return new NextResponse(pdfBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="Statement-${userRecord.email}.pdf"`,
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
