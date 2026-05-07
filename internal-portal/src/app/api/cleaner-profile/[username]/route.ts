import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { withAuth, withTracing, withSecurityHeaders, withCsrf } from "@/lib/middleware";

export async function GET(request: NextRequest, { params }: { params: { username: string } }) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['cleaner', 'admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;

  try {
    const profile = await db.prepare(
      'SELECT * FROM cleaner_profiles WHERE username = ?'
    ).bind(params.username).first();

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    const response = NextResponse.json(profile);
    response.headers.set('Cache-Control', 'private, max-age=60');
    return withSecurityHeaders(response, traceId);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { username: string } }) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db, user } = authResult;

  const csrfResponse = await withCsrf(request);
  if (csrfResponse) return withSecurityHeaders(csrfResponse, traceId);

  try {
    const result = await db.prepare(
      'DELETE FROM cleaner_profiles WHERE username = ?'
    ).bind(params.username).run();

    if (result.meta.changes === 0) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete profile" }, { status: 500 });
  }
}
