import { NextRequest, NextResponse } from 'next/server';

const DIRECTUS_URL = process.env.DIRECTUS_URL || '';
const DIRECTUS_TOKEN = process.env.DIRECTUS_TOKEN || '';

export async function GET(request: NextRequest, { params }: { params: { page: string } }) {
  try {
    const pageSlug = params.page;
    const url = new URL(`${DIRECTUS_URL}/items/pages`);
    url.searchParams.append('filter[slug][_eq]', pageSlug);
    url.searchParams.append('limit', '1');

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (DIRECTUS_TOKEN) headers['Authorization'] = `Bearer ${DIRECTUS_TOKEN}`;

    const directusResponse = await fetch(url.toString(), { headers });
    if (!directusResponse.ok) throw new Error(`Directus error: ${directusResponse.statusText}`);

    const json = await directusResponse.json();
    const data = json.data?.data || json.data || [];
    if (data.length === 0) return NextResponse.json({ error: 'Page not found' }, { status: 404 });

    const response = NextResponse.json(data[0]);
    response.headers.set('Cache-Control', 'public, max-age=300, s-maxage=600');
    return response;
  } catch (error) {
    console.error('Error fetching content:', error);
    return NextResponse.json({ error: 'Failed to fetch content' }, { status: 500 });
  }
}
