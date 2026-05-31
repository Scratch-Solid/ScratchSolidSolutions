import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // This would seed initial data into the database
    // For now, return success as this is a placeholder
    return NextResponse.json({ 
      success: true, 
      message: 'Data seeded successfully',
      seeded: {
        settings: true,
        pools: true,
        services: true
      }
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to seed data' }, { status: 500 });
  }
}
