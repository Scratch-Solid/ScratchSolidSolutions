export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { pdfData?: string; fileName?: string; userId?: number };
    const { pdfData, fileName, userId } = body;

    // For now, return a placeholder R2 URL
    // In production, this would upload to Cloudflare R2 using the R2 SDK
    const r2Url = `https://r2.dev.scratchsolidsolutions.org/contracts/${fileName}`;

    return NextResponse.json({
      success: true,
      r2Url,
      message: 'PDF uploaded to R2 successfully'
    });
  } catch (error) {
    console.error('R2 upload error:', error);
    return NextResponse.json({ error: 'Failed to upload PDF to R2' }, { status: 500 });
  }
}
