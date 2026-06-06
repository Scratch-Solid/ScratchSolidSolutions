export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const text = await request.text();
    console.log('Raw body text:', JSON.stringify(text));
    console.log('Body length:', text.length);
    console.log('Body bytes:', [...text].map(c => c.charCodeAt(0)));
    
    try {
      const json = JSON.parse(text);
      return NextResponse.json({ success: true, text, json });
    } catch (parseError) {
      return NextResponse.json({ 
        success: false, 
        text, 
        textLength: text.length,
        textBytes: [...text].map(c => c.charCodeAt(0)),
        parseError: String(parseError) 
      }, { status: 400 });
    }
  } catch (error) {
    console.error('Error reading body:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
