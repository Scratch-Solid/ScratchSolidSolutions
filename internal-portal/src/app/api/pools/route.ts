export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withTracing, withSecurityHeaders } from '@/lib/middleware';
import { parsePaginationParams, calculatePagination } from '@/lib/pagination';
import { validateQueryParams, validateRequestBodyLengths, sanitizeInput } from '@/lib/validation';
import { log } from '@/lib/logger';

export async function GET(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;

  try {
    const { searchParams } = new URL(request.url);
    const poolType = searchParams.get('pool_type');
    const status = searchParams.get('status');

    // Validate query parameters
    const validation = validateQueryParams(
      { pool_type: poolType, status: status },
      {
        pool_type: { type: 'string', enum: ['INDIVIDUAL', 'BUSINESS'] },
        status: { type: 'string', enum: ['active', 'inactive'] }
      }
    );

    if (!validation.valid) {
      const response = NextResponse.json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid query parameters',
          details: {
            errors: validation.errors
          },
          suggestion: 'Please check the query parameters and try again'
        }
      }, { status: 400 });
      return withSecurityHeaders(response, traceId);
    }

    const { page, limit, offset } = parsePaginationParams({
      page: searchParams.get('page'),
      limit: searchParams.get('limit')
    });

    let query = 'SELECT * FROM cleaner_pools';
    const conditions: string[] = [];
    const params: any[] = [];

    if (poolType) {
      conditions.push('pool_type = ?');
      params.push(poolType);
    }

    if (status) {
      conditions.push('status = ?');
      params.push(status);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY created_at DESC';

    // Get total count
    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as count');
    const countResult = await db.prepare(countQuery).bind(...params).first();
    const total = (countResult as any)?.count || 0;

    // Get paginated results
    query += ' LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const pools = await db.prepare(query).bind(...params).all();
    const pagination = calculatePagination(page, limit, total);

    const response = NextResponse.json({
      success: true,
      data: pools.results || [],
      pagination
    });
    response.headers.set('Cache-Control', 'private, max-age=60');
    return withSecurityHeaders(response, traceId);

  } catch (error) {
    console.error('Pools fetch error:', error);
    const response = NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch cleaner pools',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        suggestion: 'Please try again later or contact support if the issue persists'
      }
    }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}

export async function POST(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;

  try {
    const body = await request.json() as { name?: string; pool_type?: string; description?: string; max_cleaners?: number };
    const { name, pool_type, description, max_cleaners } = body;
    const userId = authResult.user?.id;

    // Validate required fields
    if (!name || !pool_type) {
      const response = NextResponse.json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Missing required fields',
          details: {
            required_fields: ['name', 'pool_type']
          },
          suggestion: 'Please provide both name and pool_type'
        }
      }, { status: 400 });
      return withSecurityHeaders(response, traceId);
    }

    // Validate pool type
    if (!['INDIVIDUAL', 'BUSINESS'].includes(pool_type)) {
      const response = NextResponse.json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid pool type',
          details: {
            field: 'pool_type',
            value: pool_type,
            allowed_values: ['INDIVIDUAL', 'BUSINESS']
          },
          suggestion: 'Pool type must be either INDIVIDUAL or BUSINESS'
        }
      }, { status: 400 });
      return withSecurityHeaders(response, traceId);
    }

    // Validate field lengths
    const lengthValidation = validateRequestBodyLengths(
      { name, description },
      { name: 'name', description: 'bio' }
    );

    if (!lengthValidation.valid) {
      const response = NextResponse.json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid field lengths',
          details: {
            errors: lengthValidation.errors
          },
          suggestion: 'Please check the field lengths and try again'
        }
      }, { status: 400 });
      return withSecurityHeaders(response, traceId);
    }

    // Sanitize inputs
    const sanitizedName = sanitizeInput(name);
    const sanitizedDescription = description ? sanitizeInput(description) : null;

    await db.prepare(
      'INSERT INTO cleaner_pools (name, pool_type, description, max_cleaners, current_cleaners, status, created_at, updated_at) VALUES (?, ?, ?, ?, 0, "active", datetime("now"), datetime("now"))'
    ).bind(
      sanitizedName,
      pool_type,
      sanitizedDescription,
      max_cleaners || 10
    ).run();

    // Log audit event
    log.audit('CREATE', 'cleaner_pool', {
      traceId,
      userId,
      poolName: sanitizedName,
      poolType: pool_type,
      maxCleaners: max_cleaners || 10
    });

    const response = NextResponse.json({
      success: true,
      message: 'Pool created successfully'
    });
    return withSecurityHeaders(response, traceId);

  } catch (error) {
    console.error('Pool creation error:', error);
    const response = NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create pool',
        details: {
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        suggestion: 'Please try again later or contact support if the issue persists'
      }
    }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}
