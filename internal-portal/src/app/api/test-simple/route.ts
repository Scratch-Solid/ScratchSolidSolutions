import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ 
    message: 'Simple test working',
    timestamp: new Date().toISOString(),
    bypass: 'middleware'
  });
}
