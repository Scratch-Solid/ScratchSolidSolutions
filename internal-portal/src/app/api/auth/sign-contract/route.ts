export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { getDb, updateUserOnboardingStage, createOrUpdateStaffRecord, logOnboardingTransition, logNotification } from '@/lib/db';
import { verifyAccessToken } from '@/lib/auth';
import { notifyContractSigned } from '@/lib/notifications';

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    const decoded = verifyAccessToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const db = await getDb();
    if (!db) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
    }

    const body = await request.json();
    const { signatureDate, signatureData, geolocation } = body;

    // Get user info for notification
    const user = await db.prepare('SELECT name, phone FROM users WHERE id = ?').bind(decoded.userId).first();

    // Capture signature metadata
    const signatureMetadata = {
      signatureDate,
      signatureData: signatureData || null,
      geolocation: geolocation || null,
      ipAddress: request.headers.get('x-forwarded-for') || request.headers.get('cf-connecting-ip') || null,
      userAgent: request.headers.get('user-agent') || null,
      timestamp: new Date().toISOString()
    };

    // Update user onboarding stage to contract_signed
    await updateUserOnboardingStage(db, decoded.userId, 'contract_signed');

    // Update staff record with contract signing info and signature metadata
    await createOrUpdateStaffRecord(db, {
      user_id: decoded.userId,
      onboarding_stage: 'contract_signed'
    });

    // Store signature metadata in staff table (add column if needed)
    await db.prepare(`ALTER TABLE staff ADD COLUMN signature_metadata TEXT`).run().catch(() => {});
    await db.prepare(`UPDATE staff SET signature_metadata = ? WHERE user_id = ?`).bind(JSON.stringify(signatureMetadata), decoded.userId).run();

    // Log the stage transition
    await logOnboardingTransition(db, {
      user_id: decoded.userId,
      from_stage: 'profile_created',
      to_stage: 'contract_signed',
      event_type: 'contract_signed',
      metadata: { ...signatureMetadata },
      ip_address: request.headers.get('x-forwarded-for') || undefined,
      user_agent: request.headers.get('user-agent') || undefined
    });

    // Send WhatsApp notification for contract signed
    if (user && (user as any).phone) {
      const notifyResult = await notifyContractSigned((user as any).phone, (user as any).name);
      await logNotification(db, {
        user_id: decoded.userId,
        phone_number: (user as any).phone,
        notification_type: 'contract_signed',
        channel: 'whatsapp',
        template_name: 'contract_signed',
        status: notifyResult.success ? 'sent' : 'failed',
        message_id: notifyResult.messageId,
        error_message: notifyResult.error,
        metadata: { signatureDate }
      });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Contract signed successfully',
      signatureDate 
    });
  } catch (error) {
    console.error('Sign contract error:', error);
    return NextResponse.json({ error: 'Failed to sign contract' }, { status: 500 });
  }
}
