export const dynamic = "force-dynamic";
import { NextResponse } from 'next/server';
import { generateCsrfTokenForClient } from '@/lib/middleware';

export async function GET() {
  try {
    const token = await generateCsrfTokenForClient();
    return NextResponse.json({ csrfToken: token });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
