import { NextRequest, NextResponse } from 'next/server';

// Public POST: submit a quote request
export async function POST(request: NextRequest) {
  try {
    return NextResponse.json({ success: true, message: 'Quote API is working' }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to process quote' }, { status: 500 });
  }
}

// Admin GET: list all quote requests
export async function GET(request: NextRequest) {
  try {
    return NextResponse.json({ success: true, message: 'GET quote API is working' }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch quotes' }, { status: 500 });
  }
}
