import { NextRequest, NextResponse } from 'next/server';
import { getDirectusItem, updateDirectusItem, getDirectusItems } from '../../../../../lib/directus';

interface ContentPage {
  id: string;
  slug: string;
  title: string;
  content: string;
  status: 'published' | 'draft';
  created_at: string;
  updated_at: string;
}

export async function GET(request: NextRequest, { params }: { params: { page: string } }) {
  try {
    const pageSlug = params.page;

    // Try to get page by slug
    const pages = await getDirectusItems<ContentPage>('pages', {
      filter: { slug: { _eq: pageSlug } },
      limit: 1,
    });

    if (pages.length === 0) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 });
    }

    return NextResponse.json(pages[0]);
  } catch (error) {
    console.error('Error fetching content page:', error);
    return NextResponse.json({ error: 'Failed to fetch content page' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: { page: string } }) {
  try {
    const pageSlug = params.page;
    const body = await request.json();
    const { title, content, status } = body;

    if (!title && !content && !status) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    // Get the page by slug first
    const pages = await getDirectusItems<ContentPage>('pages', {
      filter: { slug: { _eq: pageSlug } },
      limit: 1,
    });

    if (pages.length === 0) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 });
    }

    const pageId = pages[0].id;

    // Update the page
    const updatedPage = await updateDirectusItem<ContentPage>('pages', pageId, {
      ...(title && { title }),
      ...(content && { content }),
      ...(status && { status }),
    });

    return NextResponse.json(updatedPage);
  } catch (error) {
    console.error('Error updating content page:', error);
    return NextResponse.json({ error: 'Failed to update content page' }, { status: 500 });
  }
}
