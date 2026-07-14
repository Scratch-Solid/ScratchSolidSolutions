export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { getDb, updateUserOnboardingStage, createOrUpdateStaffRecord, logOnboardingTransition, logNotification } from '@/lib/db';
import { verifyAccessToken } from '@/lib/auth';
import { ensureCleanerTrainingProgress } from '@/lib/cleaner-training';
import { notifyContractSigned } from '@/lib/notifications';
import { getExperimentAssignment, trackExperimentEvent } from '@/lib/ab-testing';

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    const decoded = await verifyAccessToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const db = await getDb();
    if (!db) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
    }

    const body = await request.json() as { signatureDate?: string; signatureData?: string; geolocation?: any };
    const { signatureDate, signatureData, geolocation } = body;

    // Get user info for notification
    const user = await db.prepare('SELECT name, phone FROM users WHERE id = ?').bind(decoded.userId).first();
    const cleanerProfile = await db.prepare(
      'SELECT paysheet_code FROM cleaner_profiles WHERE user_id = ?'
    ).bind(decoded.userId).first();

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

    if (cleanerProfile) {
      const cleaner = cleanerProfile as { paysheet_code?: string };
      if (cleaner.paysheet_code) {
        await ensureCleanerTrainingProgress(db, cleaner.paysheet_code);
        await db.prepare(
          `UPDATE training_progress
           SET contract_signed = 1, contract_signed_at = ?, updated_at = datetime('now')
           WHERE employee_id = ?`
        ).bind(signatureDate || signatureMetadata.timestamp, cleaner.paysheet_code).run();
      }
    }

    // Update staff record with contract signing info and signature metadata
    await createOrUpdateStaffRecord(db, {
      user_id: decoded.userId,
      onboarding_stage: 'contract_signed'
    });

    // Store signature metadata in staff table (add column if needed)
    await db.prepare(`ALTER TABLE staff ADD COLUMN signature_metadata TEXT`).run().catch(() => {});
    await db.prepare(`UPDATE staff SET signature_metadata = ? WHERE user_id = ?`).bind(JSON.stringify(signatureMetadata), decoded.userId).run();

    // Add contract_url column to staff table if needed
    await db.prepare(`ALTER TABLE staff ADD COLUMN contract_url TEXT`).run().catch(() => {});

    // Generate and upload PDF (placeholder - would call actual PDF generation in production)
    const contractUrl = `https://r2.dev.scratchsolidsolutions.org/contracts/${decoded.userId}_${Date.now()}.pdf`;
    await db.prepare(`UPDATE staff SET contract_url = ? WHERE user_id = ?`).bind(contractUrl, decoded.userId).run();

    // Initialize contract versioning tables
    await db.prepare(`
      CREATE TABLE IF NOT EXISTS contract_versions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        version_number TEXT NOT NULL,
        template_content TEXT NOT NULL,
        effective_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_by INTEGER,
        is_active BOOLEAN DEFAULT 1
      )
    `).run();

    await db.prepare(`
      CREATE TABLE IF NOT EXISTS signed_contracts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        contract_version_id INTEGER NOT NULL,
        pdf_url TEXT NOT NULL,
        signature_metadata TEXT,
        signed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        ip_address TEXT,
        user_agent TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (contract_version_id) REFERENCES contract_versions(id)
      )
    `).run();

    // Get or create active contract version
    let contractVersion = await db.prepare('SELECT id FROM contract_versions WHERE is_active = 1 ORDER BY id DESC LIMIT 1').first();
    if (!contractVersion) {
      const result = await db.prepare('INSERT INTO contract_versions (version_number, template_content) VALUES (?, ?)').bind('1.0', 'Standard Employment Contract').run();
      contractVersion = { id: result.meta.last_row_id };
    }

    // Store signed contract record
    await db.prepare(`
      INSERT INTO signed_contracts (user_id, contract_version_id, pdf_url, signature_metadata, ip_address, user_agent)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      decoded.userId,
      (contractVersion as any).id,
      contractUrl,
      JSON.stringify(signatureMetadata),
      signatureMetadata.ipAddress,
      signatureMetadata.userAgent
    ).run();

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
      const notifyResult = await notifyContractSigned((user as any).phone, (user as any).name, undefined, db);
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

    // Track A/B testing event
    const sessionId = request.headers.get('x-session-id') || Math.random().toString();
    const abVariant = getExperimentAssignment('onboarding_flow_v2', decoded.userId, sessionId);
    if (abVariant) {
      trackExperimentEvent('onboarding_flow_v2', abVariant, 'contract_signed', {
        user_id: decoded.userId,
        signatureDate
      });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Contract signed successfully',
      signatureDate,
      redirect_to: cleanerProfile ? '/cleaner-pre-dashboard' : '/cleaner-dashboard?training_required=true'
    });
  } catch (error) {
    console.error('Sign contract error:', error);
    return NextResponse.json({ error: `Failed to sign contract: ${error instanceof Error ? error.message : 'Unknown error'}` }, { status: 500 });
  }
}
