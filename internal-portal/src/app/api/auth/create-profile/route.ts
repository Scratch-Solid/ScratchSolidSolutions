export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { getDb, addOnboardingColumnsToStaff, createOrUpdateStaffRecord, addOnboardingStageToUsers, updateUserOnboardingStage, logOnboardingTransition, logNotification } from '@/lib/db';
import bcrypt from 'bcryptjs';
import { generateAccessToken } from '@/lib/auth';
import { notifyProfileCreated } from '@/lib/notifications';
import { getExperimentAssignment, trackExperimentEvent } from '@/lib/ab-testing';
import { encryptField } from '@/lib/encryption';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      firstName?: string;
      lastName?: string;
      residentialAddress?: string;
      cellphone?: string;
      password?: string;
      confirmPassword?: string;
      profilePicture?: string;
      consentData?: any;
    };

    const { firstName, lastName, residentialAddress, cellphone, password, confirmPassword, profilePicture, consentData } = body;

    // Validate required fields
    if (!firstName || !lastName || !residentialAddress || !cellphone) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate password (now required)
    if (!password) {
      return NextResponse.json({ error: 'Password is required' }, { status: 400 });
    }
    if (password !== confirmPassword) {
      return NextResponse.json({ error: 'Passwords do not match' }, { status: 400 });
    }
    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }

    const db = await getDb();
    if (!db) {
      return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
    }

    // Get username from consent data
    const username = consentData?.generatedUsername || consentData?.generated_username;
    if (!username) {
      return NextResponse.json({ error: 'Username not found in consent data' }, { status: 400 });
    }

    // Find user by username
    const user = await db.prepare('SELECT id, email, role FROM users WHERE username = ?').bind(username).first();
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Encrypt sensitive PII fields
    const encryptedCellphone = await encryptField(cellphone);
    const encryptedResidentialAddress = await encryptField(residentialAddress);

    // Update user profile
    const fullName = `${firstName} ${lastName}`;
    const userUpdates: string[] = [];
    const userParams: any[] = [];

    userUpdates.push('name = ?');
    userParams.push(fullName);

    userUpdates.push('phone = ?');
    userParams.push(encryptedCellphone);

    if (encryptedResidentialAddress) {
      userUpdates.push('address = ?');
      userParams.push(encryptedResidentialAddress);
    }

    // Update password (now required)
    const passwordHash = await bcrypt.hash(password, 12);
    userUpdates.push('password_hash = ?');
    userParams.push(passwordHash);
    userUpdates.push('password_needs_reset = 0');

    userParams.push((user as any).id);

    const userQuery = `UPDATE users SET ${userUpdates.join(', ')} WHERE id = ?`;
    await db.prepare(userQuery).bind(...userParams).run();

    // Update or create cleaner profile with profile picture
    const cleanerProfile = await db.prepare('SELECT * FROM cleaner_profiles WHERE user_id = ?').bind((user as any).id).first();
    
    if (cleanerProfile) {
      // Update existing profile
      const profileUpdates: string[] = [];
      const profileParams: any[] = [];

      profileUpdates.push('first_name = ?');
      profileParams.push(firstName);
      profileUpdates.push('last_name = ?');
      profileParams.push(lastName);
      profileUpdates.push('residential_address = ?');
      profileParams.push(encryptedResidentialAddress);
      profileUpdates.push('cellphone = ?');
      profileParams.push(encryptedCellphone);

      if (profilePicture) {
        profileUpdates.push('profile_picture = ?');
        profileParams.push(profilePicture);
      }

      profileParams.push((user as any).id);

      const profileQuery = `UPDATE cleaner_profiles SET ${profileUpdates.join(', ')} WHERE user_id = ?`;
      await db.prepare(profileQuery).bind(...profileParams).run();
    } else {
      // Create new cleaner profile
      await db.prepare(
        `INSERT INTO cleaner_profiles (user_id, first_name, last_name, residential_address, cellphone, profile_picture, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, 'idle', datetime('now'), datetime('now'))`
      ).bind((user as any).id, firstName, lastName, encryptedResidentialAddress, encryptedCellphone, profilePicture || '').run();
    }

    // Ensure staff table has onboarding columns
    await addOnboardingColumnsToStaff(db);

    // Ensure users table has onboarding_stage column
    await addOnboardingStageToUsers(db);

    // Create or update staff record with department mapping
    const department = 'cleaning'; // Default to cleaning for new cleaners
    await createOrUpdateStaffRecord(db, {
      user_id: (user as any).id,
      first_name: firstName,
      last_name: lastName,
      cellphone: cellphone,
      email: (user as any).email,
      department: department,
      onboarding_stage: 'profile_created'
    });

    // Update user onboarding stage
    await updateUserOnboardingStage(db, (user as any).id, 'profile_created');
    
    // Log the stage transition
    await logOnboardingTransition(db, {
      user_id: (user as any).id,
      from_stage: 'consent_approved',
      to_stage: 'profile_created',
      event_type: 'profile_created',
      metadata: { profile_data: { firstName, lastName, cellphone } },
      ip_address: request.headers.get('x-forwarded-for') || undefined,
      user_agent: request.headers.get('user-agent') || undefined
    });

    // Send WhatsApp notification for profile created
    const notifyResult = await notifyProfileCreated(cellphone, fullName, undefined, db);
    await logNotification(db, {
      user_id: (user as any).id,
      phone_number: cellphone,
      notification_type: 'profile_created',
      channel: 'whatsapp',
      status: notifyResult.success ? 'sent' : 'failed',
      message_id: notifyResult.messageId,
      error_message: notifyResult.error,
      metadata: { notifyResult }
    });

    // Track A/B testing event
    const sessionId = request.headers.get('x-session-id') || Math.random().toString();
    const abVariant = getExperimentAssignment('onboarding_flow_v2', (user as any).id, sessionId);
    if (abVariant) {
      trackExperimentEvent('onboarding_flow_v2', abVariant, 'profile_created', {
        user_id: (user as any).id,
        department
      });
    }

    // Generate JWT token for auto-login after profile creation
    const token = generateAccessToken(
      (user as any).id,
      (user as any).email,
      (user as any).role
    );

    return NextResponse.json({ 
      success: true, 
      message: 'Profile created successfully',
      token,
      user_id: (user as any).id,
      email: (user as any).email,
      role: (user as any).role
    }, { status: 200 });
  } catch (error) {
    console.error('Create profile error:', error);
    return NextResponse.json({ error: 'Failed to create profile' }, { status: 500 });
  }
}
