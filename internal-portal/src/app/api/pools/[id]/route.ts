export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { withAuth, withTracing, withSecurityHeaders } from '@/lib/middleware';
import { validateRequestBodyLengths, sanitizeInput } from '@/lib/validation';
import { log } from '@/lib/logger';

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;

  try {
  const { id } = await params;
    const poolId = parseInt(id);
    const body = await request.json() as { name?: string; pool_type?: string; description?: string; max_cleaners?: number; status?: string };
    const { name, pool_type, description, max_cleaners, status } = body;
    const userId = authResult.user?.id;

    // Check if pool exists
    const existingPool = await db.prepare(
      'SELECT id FROM cleaner_pools WHERE id = ?'
    ).bind(poolId).first();

    if (!existingPool) {
      const response = NextResponse.json({
        success: false,
        error: {
          code: 'RESOURCE_NOT_FOUND',
          message: 'Pool not found',
          details: {
            resource: 'pool',
            id: poolId
          },
          suggestion: 'The pool may have been deleted or the ID is incorrect'
        }
      }, { status: 404 });
      return withSecurityHeaders(response, traceId);
    }

    const updates: string[] = [];
    const values: any[] = [];
    const changes: Record<string, any> = {};

    if (name !== undefined) {
      updates.push('name = ?');
      const sanitizedName = sanitizeInput(name);
      values.push(sanitizedName);
      changes.name = sanitizedName;
    }
    if (pool_type !== undefined) {
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
      updates.push('pool_type = ?');
      values.push(pool_type);
      changes.pool_type = pool_type;
    }
    if (description !== undefined) {
      updates.push('description = ?');
      const sanitizedDescription = sanitizeInput(description);
      values.push(sanitizedDescription);
      changes.description = sanitizedDescription;
    }
    if (max_cleaners !== undefined) {
      updates.push('max_cleaners = ?');
      values.push(max_cleaners);
      changes.max_cleaners = max_cleaners;
    }
    if (status !== undefined) {
      if (!['active', 'inactive'].includes(status)) {
        const response = NextResponse.json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid status',
            details: {
              field: 'status',
              value: status,
              allowed_values: ['active', 'inactive']
            },
            suggestion: 'Status must be either active or inactive'
          }
        }, { status: 400 });
        return withSecurityHeaders(response, traceId);
      }
      updates.push('status = ?');
      values.push(status);
      changes.status = status;
    }

    if (updates.length === 0) {
      const response = NextResponse.json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'No fields to update',
          details: {
            available_fields: ['name', 'pool_type', 'description', 'max_cleaners', 'status']
          },
          suggestion: 'Please provide at least one field to update'
        }
      }, { status: 400 });
      return withSecurityHeaders(response, traceId);
    }

    updates.push('updated_at = datetime("now")');
    values.push(poolId);

    await db.prepare(
      `UPDATE cleaner_pools SET ${updates.join(', ')} WHERE id = ?`
    ).bind(...values).run();

    // Log audit event
    log.audit('UPDATE', 'cleaner_pool', {
      traceId,
      userId,
      poolId,
      changes
    });

    const response = NextResponse.json({
      success: true,
      message: 'Pool updated successfully'
    });
    return withSecurityHeaders(response, traceId);

  } catch (error) {
    console.error('Pool update error:', error);
    const response = NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: `Failed to update pool: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: {
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        suggestion: 'Please try again later or contact support if the issue persists'
      }
    }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;

  try {
  const { id } = await params;
    const poolId = parseInt(id);
    const userId = authResult.user?.id;

    // Check if pool exists
    const existingPool = await db.prepare(
      'SELECT id, name FROM cleaner_pools WHERE id = ?'
    ).bind(poolId).first();

    if (!existingPool) {
      const response = NextResponse.json({
        success: false,
        error: {
          code: 'RESOURCE_NOT_FOUND',
          message: 'Pool not found',
          details: {
            resource: 'pool',
            id: poolId
          },
          suggestion: 'The pool may have been deleted or the ID is incorrect'
        }
      }, { status: 404 });
      return withSecurityHeaders(response, traceId);
    }

    await db.prepare(
      'DELETE FROM cleaner_pools WHERE id = ?'
    ).bind(poolId).run();

    // Log audit event
    log.audit('DELETE', 'cleaner_pool', {
      traceId,
      userId,
      poolId,
      poolName: (existingPool as any).name
    });

    const response = NextResponse.json({
      success: true,
      message: 'Pool deleted successfully'
    });
    return withSecurityHeaders(response, traceId);

  } catch (error) {
    console.error('Pool deletion error:', error);
    const response = NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: `Failed to delete pool: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: {
          error: error instanceof Error ? error.message : 'Unknown error'
        },
        suggestion: 'Please try again later or contact support if the issue persists'
      }
    }, { status: 500 });
    return withSecurityHeaders(response, traceId);
  }
}
