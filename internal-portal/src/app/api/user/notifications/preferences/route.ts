export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { getDb, getNotificationPreferences, updateNotificationPreferences } from '@/lib/db';
import { verifyAccessToken } from '@/lib/auth';

export async function GET(request: NextRequest) {
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

    const preferences = await getNotificationPreferences(db, decoded.userId);
    return NextResponse.json({ preferences });
  } catch (error) {
    console.error('Get notification preferences error:', error);
    return NextResponse.json({ error: 'Failed to get preferences' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
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
    const { whatsapp, email } = body;

    if (typeof whatsapp !== 'boolean' && typeof email !== 'boolean') {
      return NextResponse.json({ error: 'At least one preference must be specified' }, { status: 400 });
    }

    const success = await updateNotificationPreferences(db, decoded.userId, { whatsapp, email });
    if (!success) {
      return NextResponse.json({ error: 'Failed to update preferences' }, { status: 500 });
    }

    const updatedPreferences = await getNotificationPreferences(db, decoded.userId);
    return NextResponse.json({ preferences: updatedPreferences });
  } catch (error) {
    console.error('Update notification preferences error:', error);
    return NextResponse.json({ error: 'Failed to update preferences' }, { status: 500 });
  }
}
