export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withTracing, withSecurityHeaders } from '@/lib/middleware';

export async function GET(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { user, db } = authResult;

  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const publicOnly = searchParams.get('public_only') === 'true';

    let query = 'SELECT id, key, value, category, description, is_public, created_at, updated_at FROM settings';
    const conditions: string[] = [];
    const params: any[] = [];

    // Non-admin users can only see public settings
    const userRole = (user as any).role;
    if (userRole !== 'admin' || publicOnly) {
      conditions.push('is_public = 1');
    }

    if (category) {
      conditions.push('category = ?');
      params.push(category);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY category, key';

    const settings = await db.prepare(query).bind(...params).all();

    // Transform into key-value object for easier consumption
    const settingsObject: Record<string, any> = {};
    for (const setting of (settings.results || [])) {
      settingsObject[(setting as any).key] = {
        value: (setting as any).value,
        category: (setting as any).category,
        description: (setting as any).description,
        is_public: (setting as any).is_public === 1,
        updated_at: (setting as any).updated_at
      };
    }

    const response = NextResponse.json({
      success: true,
      data: settingsObject,
      raw: settings.results || []
    });
    response.headers.set('Cache-Control', 'private, max-age=300');
    return withSecurityHeaders(response, traceId);

  } catch (error) {
    console.error('Settings fetch error:', error);
    const response = NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch settings',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        suggestion: 'Please try again later or contact support if the issue persists'
      }
    }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}

export async function PUT(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { user, db } = authResult;

  try {
    const body = await request.json() as { key?: string; value?: string; category?: string; description?: string; is_public?: boolean };
    const { key, value, category, description, is_public } = body;

    if (!key || value === undefined) {
      const response = NextResponse.json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Missing required fields',
          details: {
            required_fields: ['key', 'value']
          },
          suggestion: 'Please provide both key and value'
        }
      }, { status: 400 });
      return withSecurityHeaders(response, traceId);
    }

    // Check if setting exists
    const existingSetting = await db.prepare(
      'SELECT id FROM settings WHERE key = ?'
    ).bind(key).first();

    if (existingSetting) {
      // Update existing setting
      const updates: string[] = ['value = ?', 'updated_at = datetime("now")'];
      const values: any[] = [value];

      if (category !== undefined) {
        updates.push('category = ?');
        values.push(category);
      }
      if (description !== undefined) {
        updates.push('description = ?');
        values.push(description);
      }
      if (is_public !== undefined) {
        updates.push('is_public = ?');
        values.push(is_public ? 1 : 0);
      }

      values.push(key);

      await db.prepare(
        `UPDATE settings SET ${updates.join(', ')} WHERE key = ?`
      ).bind(...values).run();
    } else {
      // Create new setting
      await db.prepare(
        'INSERT INTO settings (key, value, category, description, is_public, created_at, updated_at) VALUES (?, ?, ?, ?, ?, datetime("now"), datetime("now"))'
      ).bind(
        key,
        value,
        category || 'general',
        description || null,
        is_public !== undefined ? (is_public ? 1 : 0) : 0
      ).run();
    }

    const response = NextResponse.json({
      success: true,
      message: existingSetting ? 'Setting updated successfully' : 'Setting created successfully'
    });
    return withSecurityHeaders(response, traceId);

  } catch (error) {
    console.error('Settings update error:', error);
    const response = NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to update settings',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        suggestion: 'Please try again later or contact support if the issue persists'
      }
    }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}
