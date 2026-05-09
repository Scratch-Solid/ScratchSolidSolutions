import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    let body;
    try {
      body = await request.json();
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      body = {};
    }
    
    // Mock 2FA setup response for testing
    const secret = 'JBSWY3DPEHPK3PXP'; // Base32 encoded secret
    const qrCodeUrl = `otpauth://totp/ScratchSolid:test@example.com?secret=${secret}&issuer=ScratchSolid&algorithm=SHA1&digits=6&period=30`;
    
    const backupCodes = Array.from({ length: 10 }, () => 
      Math.random().toString().substr(2, 10).padEnd(10, '0')
    );

    return NextResponse.json({
      success: true,
      data: {
        secret,
        qrCodeUrl,
        backupCodes
      }
    });
  } catch (error) {
    console.error('2FA setup error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to setup 2FA', details: error.message },
      { status: 500 }
    );
  }
}
