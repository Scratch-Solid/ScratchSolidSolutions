import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '../../../../lib/db';
import { withAuth, withTracing, withSecurityHeaders, withRateLimit, rateLimits } from '@/lib/middleware';
import { logger } from '@/lib/logger';
import { validateNumber, validateString, validateDate } from '@/lib/validation';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['business', 'admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;
  const { id } = await params;

  // Rate limiting check
  const rateLimitResult = await withRateLimit(request, rateLimits.standard);
  if (rateLimitResult && !rateLimitResult.success) {
    return withSecurityHeaders(
      NextResponse.json(
        { error: 'Too many contract requests. Please try again later.' },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimitResult.limit.toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': rateLimitResult.reset.toString()
          }
        }
      ),
      traceId
    );
  }

  try {
    const contract = await db.prepare('SELECT * FROM contracts WHERE id = ?').bind(id).first();
    if (!contract) {
      const response = NextResponse.json({ error: 'Contract not found' }, { status: 404 });
      return withSecurityHeaders(response, traceId);
    }
    const response = NextResponse.json(contract);
    response.headers.set('Cache-Control', 'private, max-age=60');
    return withSecurityHeaders(response, traceId);
  } catch (error) {
    logger.error('Error fetching contract', error as Error);
    const response = NextResponse.json({ error: 'Failed to fetch contract' }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;
  const { id } = await params;

  // Rate limiting check
  const rateLimitResult = await withRateLimit(request, rateLimits.standard);
  if (rateLimitResult && !rateLimitResult.success) {
    return withSecurityHeaders(
      NextResponse.json(
        { error: 'Too many contract requests. Please try again later.' },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimitResult.limit.toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': rateLimitResult.reset.toString()
          }
        }
      ),
      traceId
    );
  }

  try {
    const existingContract = await db.prepare('SELECT * FROM contracts WHERE id = ?').bind(parseInt(id)).first();
    
    if (!existingContract) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 });
    }

    if (existingContract.is_immutable === 1) {
      return NextResponse.json({ error: 'Contract is immutable and cannot be modified' }, { status: 403 });
    }

    const body = await request.json() as {
      contract_type?: string;
      rate_per_hour?: number;
      weekend_rate_multiplier?: number;
      end_date?: string;
      terms?: string;
      status?: string;
      is_immutable?: boolean;
    };
    const { contract_type, rate_per_hour, weekend_rate_multiplier, end_date, terms, status, is_immutable } = body;

    // Validate inputs
    if (contract_type !== undefined) {
      const contractTypeValidation = validateString(contract_type, 'contract_type', 1, 100);
      if (!contractTypeValidation.valid) {
        return NextResponse.json({ error: contractTypeValidation.errors.join(', ') }, { status: 400 });
      }
    }

    if (rate_per_hour !== undefined) {
      const rateValidation = validateNumber(rate_per_hour, 'rate_per_hour', 0);
      if (!rateValidation.valid) {
        return NextResponse.json({ error: rateValidation.errors.join(', ') }, { status: 400 });
      }
    }

    if (weekend_rate_multiplier !== undefined) {
      const multiplierValidation = validateNumber(weekend_rate_multiplier, 'weekend_rate_multiplier', 0);
      if (!multiplierValidation.valid) {
        return NextResponse.json({ error: multiplierValidation.errors.join(', ') }, { status: 400 });
      }
    }

    if (end_date !== undefined) {
      const endDateValidation = validateDate(end_date, 'end_date');
      if (!endDateValidation.valid) {
        return NextResponse.json({ error: endDateValidation.errors.join(', ') }, { status: 400 });
      }
    }

    if (terms !== undefined) {
      const termsValidation = validateString(terms, 'terms', 1, 10000);
      if (!termsValidation.valid) {
        return NextResponse.json({ error: termsValidation.errors.join(', ') }, { status: 400 });
      }
    }

    if (status !== undefined) {
      const statusValidation = validateString(status, 'status', 1, 50);
      if (!statusValidation.valid) {
        return NextResponse.json({ error: statusValidation.errors.join(', ') }, { status: 400 });
      }
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (contract_type !== undefined) { updates.push('contract_type = ?'); values.push(contract_type); }
    if (rate_per_hour !== undefined) { updates.push('rate_per_hour = ?'); values.push(rate_per_hour); }
    if (weekend_rate_multiplier !== undefined) { updates.push('weekend_rate_multiplier = ?'); values.push(weekend_rate_multiplier); }
    if (end_date !== undefined) { updates.push('end_date = ?'); values.push(end_date); }
    if (terms !== undefined) { updates.push('terms = ?'); values.push(terms); }
    if (status !== undefined) { updates.push('status = ?'); values.push(status); }
    if (is_immutable !== undefined) { updates.push('is_immutable = ?'); values.push(is_immutable ? 1 : 0); }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    updates.push('updated_at = datetime(\'now\')');
    values.push(id);

    const result = await db.prepare(
      `UPDATE contracts SET ${updates.join(', ')} WHERE id = ? RETURNING *`
    ).bind(...values).first();

    const response = NextResponse.json(result);
    return withSecurityHeaders(response, traceId);
  } catch (error) {
    logger.error('Error updating contract', error as Error);
    const response = NextResponse.json({ error: 'Failed to update contract' }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;
  const { id } = await params;

  // Rate limiting check
  const rateLimitResult = await withRateLimit(request, rateLimits.standard);
  if (rateLimitResult && !rateLimitResult.success) {
    return withSecurityHeaders(
      NextResponse.json(
        { error: 'Too many contract requests. Please try again later.' },
        { 
          status: 429,
          headers: {
            'X-RateLimit-Limit': rateLimitResult.limit.toString(),
            'X-RateLimit-Remaining': rateLimitResult.remaining.toString(),
            'X-RateLimit-Reset': rateLimitResult.reset.toString()
          }
        }
      ),
      traceId
    );
  }

  try {
    const existingContract = await db.prepare('SELECT * FROM contracts WHERE id = ?').bind(parseInt(id)).first();
    
    if (!existingContract) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 });
    }

    if (existingContract.is_immutable === 1) {
      return NextResponse.json({ error: 'Contract is immutable and cannot be deleted' }, { status: 403 });
    }

    await db.prepare('DELETE FROM contracts WHERE id = ?').bind(id).run();

    const response = NextResponse.json({ success: true });
    return withSecurityHeaders(response, traceId);
  } catch (error) {
    logger.error('Error deleting contract', error as Error);
    const response = NextResponse.json({ error: 'Failed to delete contract' }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}
