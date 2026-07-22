export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withSecurityHeaders, withTracing } from '@/lib/middleware';
import { CLEANER_TRAINING_MODULES } from '@/lib/cleaner-training';

// Module catalog is source-defined (lib/cleaner-training.ts), not DB-managed -
// this just exposes titles/durations for the admin Training page. Quiz
// content is intentionally omitted from this response.
export async function GET(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);

  const modules = CLEANER_TRAINING_MODULES.map((m) => ({
    id: m.id,
    title: m.title,
    description: m.description,
    duration_minutes: m.duration_minutes,
    quiz_questions: m.quiz.length,
  }));

  return withSecurityHeaders(NextResponse.json({ modules }), traceId);
}
