import { NextRequest, NextResponse } from "next/server";
import { getDb, getCleanerProfileByUsername, updateCleanerProfile } from "../../../lib/db";
import { withAuth, withTracing, withSecurityHeaders } from "../../../lib/middleware";

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
      const response = NextResponse.json(profile);
      response.headers.set('Cache-Control', 'private, max-age=60');
      return withSecurityHeaders(response, traceId);
    }
    const response = NextResponse.json({ error: "Profile not found" }, { status: 404 });
    return withSecurityHeaders(response, traceId);
  }
  
  // Get all profiles
  const result = await db.prepare('SELECT * FROM cleaner_profiles ORDER BY created_at DESC').all();
  const response = NextResponse.json(result.results);
  response.headers.set('Cache-Control', 'private, max-age=30');
  return withSecurityHeaders(response, traceId);
}

export async function POST(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;

  const data = await request.json();
  
  // Check if profile already exists by username
  const existing = await getCleanerProfileByUsername(db, data.username);
  
  if (existing) {
    // Update existing profile
    const updated = await updateCleanerProfile(db, data.username, data);
    if (updated) {
      const response = NextResponse.json(updated);
      return withSecurityHeaders(response, traceId);
    }
    const response = NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
  
  // Create new profile - need user_id first
  // For now, we'll allow creating without user_id and update later
  const newProfile = {
    user_id: data.user_id || null,
    username: data.username,
    paysheet_code: data.paysheet_code || '',
    first_name: data.first_name || '',
    last_name: data.last_name || '',
    residential_address: data.residential_address || '',
    cellphone: data.cellphone || '',
    tax_number: data.tax_number || '',
    profile_picture: data.profile_picture || '',
    emergency_contact1_name: data.emergency_contact1_name || '',
    emergency_contact1_phone: data.emergency_contact1_phone || '',
    emergency_contact2_name: data.emergency_contact2_name || '',
    emergency_contact2_phone: data.emergency_contact2_phone || '',
    department: data.department || 'cleaning',
    status: 'active'
  };
  
  const result = await db.prepare(
    `INSERT INTO cleaner_profiles (
      user_id, username, paysheet_code, first_name, last_name, residential_address, 
      cellphone, tax_number, profile_picture, emergency_contact1_name, emergency_contact1_phone,
      emergency_contact2_name, emergency_contact2_phone, department, status, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now')) RETURNING *`
  ).bind(
    newProfile.user_id, newProfile.username, newProfile.paysheet_code, newProfile.first_name, newProfile.last_name,
    newProfile.residential_address, newProfile.cellphone, newProfile.tax_number, newProfile.profile_picture,
    newProfile.emergency_contact1_name, newProfile.emergency_contact1_phone, newProfile.emergency_contact2_name,
    newProfile.emergency_contact2_phone, newProfile.department, newProfile.status
  ).first();
  
  if (result) {
    const response = NextResponse.json(result, { status: 201 });
    return withSecurityHeaders(response, traceId);
  }
  const response = NextResponse.json({ error: "Failed to create profile" }, { status: 500 });
  return withSecurityHeaders(response, traceId);
}

export async function PUT(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['cleaner', 'admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;

  const data = await request.json();
  const { username } = data;
  
  if (!username) {
    return NextResponse.json({ error: "Username required" }, { status: 400 });
  }
  
  const updated = await updateCleanerProfile(db, username, data);
  if (updated) {
    const response = NextResponse.json(updated);
    return withSecurityHeaders(response, traceId);
  }
  
  const response = NextResponse.json({ error: "Profile not found" }, { status: 404 });
  return withSecurityHeaders(response, traceId);
}
