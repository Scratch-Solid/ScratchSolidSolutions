export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const db = await getDb();
    if (!db) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }
    
    const bankingDetails = await db.prepare(
      'SELECT * FROM banking_details WHERE is_active = 1 ORDER BY id DESC LIMIT 1'
    ).first();
    
    // Mask sensitive information for public display
    if (bankingDetails) {
      const masked = {
        bank_name: (bankingDetails as any).bank_name,
        account_number: maskAccountNumber((bankingDetails as any).account_number),
        account_holder: (bankingDetails as any).account_holder,
        branch_code: maskBranchCode((bankingDetails as any).branch_code),
        account_type: (bankingDetails as any).account_type
      };
      return NextResponse.json(masked);
    }
    
    return NextResponse.json(null);
  } catch (error) {
    console.error('Error fetching banking details:', error);
    return NextResponse.json({ error: 'Failed to fetch banking details' }, { status: 500 });
  }
}

function maskAccountNumber(accountNumber: string): string {
  if (!accountNumber || accountNumber.length < 4) return accountNumber;
  const lastFour = accountNumber.slice(-4);
  return 'XXXX XXXX XXXX ' + lastFour;
}

function maskBranchCode(branchCode: string): string {
  if (!branchCode || branchCode.length < 2) return branchCode;
  return 'XX' + branchCode.slice(-2);
}
