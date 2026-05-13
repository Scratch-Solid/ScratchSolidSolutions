import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { withAuth } from '@/lib/middleware';

export async function GET(request: NextRequest) {
  const authResult = await withAuth(request, ['admin']);
  if (authResult instanceof NextResponse) return authResult;
  
  try {
    const db = await getDb();
    if (!db) {
      return NextResponse.json({ error: 'Database not available' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const promoCodeId = searchParams.get('promoCodeId');
    const dateRange = searchParams.get('dateRange') || '30'; // default to last 30 days

    // Calculate date filter
    const daysAgo = parseInt(dateRange);
    const dateFilter = daysAgo > 0 ? `datetime('now', '-${daysAgo} days')` : null;

    // Get scan analytics
    let scanQuery = `
      SELECT 
        DATE(scan_timestamp) as date,
        COUNT(*) as scans,
        COUNT(DISTINCT ip_address) as unique_visitors
      FROM promo_scans
    `;
    let scanParams: (string | number)[] = [];

    if (promoCodeId) {
      scanQuery += ` WHERE promo_code_id = ?`;
      scanParams.push(parseInt(promoCodeId));
    }

    if (dateFilter) {
      scanQuery += promoCodeId ? ` AND scan_timestamp >= ${dateFilter}` : ` WHERE scan_timestamp >= ${dateFilter}`;
    }

    scanQuery += ` GROUP BY DATE(scan_timestamp) ORDER BY date DESC LIMIT ${daysAgo}`;
    
    const scanData = await db.prepare(scanQuery).bind(...scanParams).all();

    // Get distribution analytics
    let distributionQuery = `
      SELECT 
        channel,
        COUNT(*) as distributions,
        SUM(recipient_count) as total_recipients,
        MAX(distributed_at) as last_distributed
      FROM promo_distribution
    `;
    let distributionParams: (string | number)[] = [];

    if (promoCodeId) {
      distributionQuery += ` WHERE promo_code_id = ?`;
      distributionParams.push(parseInt(promoCodeId));
    }

    if (dateFilter) {
      distributionQuery += promoCodeId ? ` AND distributed_at >= ${dateFilter}` : ` WHERE distributed_at >= ${dateFilter}`;
    }

    distributionQuery += ` GROUP BY channel ORDER BY distributions DESC`;
    
    const distributionData = await db.prepare(distributionQuery).bind(...distributionParams).all();

    // Get short URL click analytics
    let shortUrlQuery = `
      SELECT 
        DATE(created_at) as date,
        SUM(clicks) as total_clicks
      FROM short_urls
    `;
    let shortUrlParams: (string | number)[] = [];

    if (promoCodeId) {
      shortUrlQuery += ` WHERE promo_code_id = ?`;
      shortUrlParams.push(parseInt(promoCodeId));
    }

    if (dateFilter) {
      shortUrlQuery += promoCodeId ? ` AND created_at >= ${dateFilter}` : ` WHERE created_at >= ${dateFilter}`;
    }

    shortUrlQuery += ` GROUP BY DATE(created_at) ORDER BY date DESC LIMIT ${daysAgo}`;
    
    const shortUrlData = await db.prepare(shortUrlQuery).bind(...shortUrlParams).all();

    // Get top performing promo codes
    let topPromosQuery = `
      SELECT 
        pc.id,
        pc.code,
        pc.description,
        pc.used_count,
        pc.distribution_count,
        COUNT(DISTINCT ps.id) as scan_count,
        SUM(su.clicks) as click_count
      FROM promo_codes pc
      LEFT JOIN promo_scans ps ON pc.id = ps.promo_code_id
      LEFT JOIN short_urls su ON pc.id = su.promo_code_id
      WHERE pc.is_active = 1
    `;

    if (dateFilter) {
      topPromosQuery += ` AND (ps.scan_timestamp >= ${dateFilter} OR su.created_at >= ${dateFilter})`;
    }

    topPromosQuery += `
      GROUP BY pc.id
      ORDER BY scan_count DESC, click_count DESC
      LIMIT 10
    `;
    
    const topPromos = await db.prepare(topPromosQuery).all();

    // Get geographic distribution (if available)
    let geoQuery = `
      SELECT 
        location_country,
        COUNT(*) as scans
      FROM promo_scans
      WHERE location_country IS NOT NULL AND location_country != ''
    `;

    if (promoCodeId) {
      geoQuery += ` AND promo_code_id = ?`;
    }

    if (dateFilter) {
      geoQuery += promoCodeId ? ` AND scan_timestamp >= ${dateFilter}` : ` AND scan_timestamp >= ${dateFilter}`;
    }

    geoQuery += ` GROUP BY location_country ORDER BY scans DESC LIMIT 10`;
    
    const geoData = await db.prepare(geoQuery).bind(...(promoCodeId ? [parseInt(promoCodeId)] : [])).all();

    return NextResponse.json({
      success: true,
      data: {
        scans: scanData.results || [],
        distribution: distributionData.results || [],
        shortUrls: shortUrlData.results || [],
        topPromos: topPromos.results || [],
        geography: geoData.results || [],
        summary: {
          totalScans: scanData.results?.reduce((sum: number, row: any) => sum + row.scans, 0) || 0,
          totalDistributions: distributionData.results?.reduce((sum: number, row: any) => sum + row.distributions, 0) || 0,
          totalClicks: shortUrlData.results?.reduce((sum: number, row: any) => sum + row.total_clicks, 0) || 0,
          uniqueVisitors: scanData.results?.reduce((sum: number, row: any) => sum + row.unique_visitors, 0) || 0,
        }
      }
    });

  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}
