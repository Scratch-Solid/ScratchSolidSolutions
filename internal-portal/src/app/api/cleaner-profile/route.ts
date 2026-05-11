export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getDb, getCleanerProfileByUsername, updateCleanerProfile, logAuditEvent } from "../../../lib/db";
import { withAuth, withTracing, withSecurityHeaders, withCsrf } from "../../../lib/middleware";

export async function GET(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['cleaner', 'admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;

  const { searchParams } = new URL(request.url);
  const username = searchParams.get("username");
  
  if (username) {
    const profile = await getCleanerProfileByUsername(db, username);
    if (profile) {
      return NextResponse.json(profile);
      response.headers.set('Cache-Control', 'private, max-age=60');
      return withSecurityHeaders(response, traceId);
    }
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    return withSecurityHeaders(response, traceId);
  }
  
  // Get all profiles with pagination
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '50', 10);
  const offset = (page - 1) * limit;

  const profiles = await db.prepare(
    'SELECT * FROM cleaner_profiles ORDER BY created_at DESC LIMIT ? OFFSET ?'
  ).bind(limit, offset).all();

  const countResult = await db.prepare('SELECT COUNT(*) as total FROM cleaner_profiles').first();
  const total = (countResult as any)?.total || 0;

  return NextResponse.json({
    data: profiles.results,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  });
  response.headers.set('Cache-Control', 'private, max-age=30');
  return withSecurityHeaders(response, traceId);
}

export async function POST(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db, user } = authResult;

  const csrfResponse = await withCsrf(request);
  if (csrfResponse) return withSecurityHeaders(csrfResponse, traceId);

  const data = await request.json();
  
  // Check if profile already exists by username
  const existing = await getCleanerProfileByUsername(db, data.username);
  
  if (existing) {
    // Update existing profile
    const updated = await updateCleanerProfile(db, data.username, data);
    if (updated) {
      await logAuditEvent(db, (user as any).id, 'update_cleaner_profile', 'cleaner_profile', (updated as any).id, JSON.stringify({ username: data.username }), request.headers.get('x-forwarded-for') || '');
      return NextResponse.json(updated, { status: 200 });
      return withSecurityHeaders(response, traceId);
    }
  } else {
    // Create new profile
    const result = await db.prepare(
      `INSERT INTO cleaner_profiles (username, paysheet_code, department, first_name, last_name, status)
       VALUES (?, ?, ?, ?, ?, 'idle') RETURNING *`
    ).bind(data.username, data.username, data.department || 'cleaning', data.first_name || '', data.last_name || '').first();
    
    if (result) {
      await logAuditEvent(db, (user as any).id, 'create_cleaner_profile', 'cleaner_profile', (result as any).id, JSON.stringify({ username: data.username }), request.headers.get('x-forwarded-for') || '');
      return NextResponse.json(result, { status: 201 });
      return withSecurityHeaders(response, traceId);
    }
  }
  return NextResponse.json({ error: "Failed to create/update profile" }, { status: 500 });
  return withSecurityHeaders(response, traceId);
}

export async function PUT(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['cleaner', 'admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db, user } = authResult;

  const csrfResponse = await withCsrf(request);
  if (csrfResponse) return withSecurityHeaders(csrfResponse, traceId);

  const data = await request.json();
  const { username } = data;
  
  if (!username) {
    return NextResponse.json({ error: "Username required" }, { status: 400 });
  }
  
  const updated = await updateCleanerProfile(db, username, data);
  if (updated) {
    if ((user as any).role === 'admin') {
      await logAuditEvent(db, (user as any).id, 'update_cleaner_profile', 'cleaner_profile', (updated as any).id, JSON.stringify({ username }), request.headers.get('x-forwarded-for') || '');
    }
    return NextResponse.json(updated);
    return withSecurityHeaders(response, traceId);
  }
  
  return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  return withSecurityHeaders(response, traceId);
}
