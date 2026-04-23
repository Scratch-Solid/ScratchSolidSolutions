import { NextRequest, NextResponse } from "next/server";
import { getDb, getCleanerProfileByUsername } from "../../../lib/db";
import { withAuth, withTracing, withSecurityHeaders } from "../../../lib/middleware";

export async function GET(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;

  const { searchParams } = new URL(request.url);
  const username = searchParams.get("username");
  
  if (username) {
    const profile = await getCleanerProfileByUsername(db, username);
    if (profile) {
      const response = NextResponse.json({
        profilePicture: (profile as any).profile_picture || '',
        fullName: `${(profile as any).first_name || ''} ${(profile as any).last_name || ''}`.trim(),
        address: (profile as any).residential_address || '',
        cellphoneNumber: (profile as any).cellphone || '',
      });
      response.headers.set('Cache-Control', 'private, max-age=60');
      return withSecurityHeaders(response, traceId);
    }
    const response = NextResponse.json({ error: "Cleaner not found" }, { status: 404 });
    return withSecurityHeaders(response, traceId);
  }
  
  const response = NextResponse.json({ error: "Username required" }, { status: 400 });
  return withSecurityHeaders(response, traceId);
}
