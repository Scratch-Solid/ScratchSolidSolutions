import { NextRequest, NextResponse } from 'next/server';
import { getDb, getEmployees, createEmployee } from "@/lib/db";
import { logger } from "@/lib/logger";
import { validateString, validateNumber } from "@/lib/validation";
import { withRateLimit, rateLimits } from "@/lib/rateLimit";
import { withAuth, withTracing, withSecurityHeaders } from '@/lib/middleware';

export async function GET(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;

  try {
    const employees = await getEmployees(db);
    return NextResponse.json(employees || []);
  } catch (error) {
    logger.error('Error fetching employees', error as Error);
    return NextResponse.json({ error: 'Failed to fetch employees' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const traceId = withTracing(request);
  const authResult = await withAuth(request, ['admin']);
  if (authResult instanceof NextResponse) return withSecurityHeaders(authResult, traceId);
  const { db } = authResult;

  const rateLimitResult = await withRateLimit(request, rateLimits.strict);
  if (rateLimitResult && !rateLimitResult.success) {
    return withSecurityHeaders(
      NextResponse.json({ error: 'Too many requests' }, { status: 429 }),
      traceId
    );
  }

  try {
    const body = await request.json() as {
      user_id?: number;
      employee_code?: string;
      department?: string;
      position?: string;
      hire_date?: string;
      salary?: number;
    };

    const { user_id, employee_code, department, position, hire_date, salary } = body;

    if (!user_id || !employee_code) {
      return NextResponse.json({ error: 'Missing required fields: user_id, employee_code' }, { status: 400 });
    }

    const employee = await createEmployee(db, {
      user_id,
      employee_code,
      department,
      position,
      hire_date,
      salary
    });

    return NextResponse.json(employee, { status: 201 });
  } catch (error) {
    logger.error('Error creating employee', error as Error);
    return NextResponse.json({ error: 'Failed to create employee' }, { status: 500 });
  }
}
