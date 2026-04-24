// Database Content Management for Marketing Site
// Uses Cloudflare D1 database for content storage

import type { D1Database } from '@cloudflare/workers-types';
import { logger } from './logger';

export interface ContentPage {
  id: string;
  title: string;
  content: string;
  slug: string;
  lastUpdated: string;
}

export interface BackgroundImage {
  id: string;
  url: string;
  name: string;
  isActive: boolean;
}

export async function getContentPage(db: D1Database, slug: string): Promise<ContentPage | null> {
  try {
    const result = await db.prepare(
      `SELECT id, title, content, slug, last_updated as lastUpdated FROM content_pages WHERE slug = ? LIMIT 1`
    ).bind(slug).first();

    if (!result) {
      return null;
    }

    return {
      id: result.id as string,
      title: result.title as string,
      content: result.content as string,
      slug: result.slug as string,
      lastUpdated: result.lastUpdated as string
    };
  } catch (error) {
    logger.error('Error fetching content page', error as Error);
    return null;
  }
}

export async function getAllContentPages(db: D1Database): Promise<ContentPage[]> {
  try {
    const results = await db.prepare(
      `SELECT id, title, content, slug, last_updated as lastUpdated FROM content_pages ORDER BY title`
    ).all();

    return results.results.map(row => ({
      id: row.id as string,
      title: row.title as string,
      content: row.content as string,
      slug: row.slug as string,
      lastUpdated: row.lastUpdated as string
    }));
  } catch (error) {
    logger.error('Error fetching all content pages', error as Error);
    return [];
  }
}

export async function updateContentPage(db: D1Database, slug: string, content: string): Promise<boolean> {
  try {
    const result = await db.prepare(
      `UPDATE content_pages SET content = ?, last_updated = datetime('now') WHERE slug = ?`
    ).bind(content, slug).run();

    return result.success;
  } catch (error) {
    logger.error('Error updating content page', error as Error);
    return false;
  }
}

export async function getActiveBackgroundImage(db: D1Database): Promise<BackgroundImage | null> {
  try {
    const result = await db.prepare(
      `SELECT id, url, name, is_active as isActive FROM background_images WHERE is_active = 1 LIMIT 1`
    ).first();

    if (!result) {
      return null;
    }

    return {
      id: result.id as string,
      url: result.url as string,
      name: result.name as string,
      isActive: result.isActive as boolean
    };
  } catch (error) {
    logger.error('Error fetching active background image', error as Error);
    return null;
  }
}

export async function updateBackgroundImage(db: D1Database, imageUrl: string): Promise<boolean> {
  try {
    // Deactivate all existing background images
    await db.prepare(`UPDATE background_images SET is_active = 0`).run();
    
    // Insert or update the new active background image
    const result = await db.prepare(
      `INSERT INTO background_images (url, name, is_active) VALUES (?, ?, 1)`
    ).bind(imageUrl, 'Updated Background').run();

    return result.success;
  } catch (error) {
    logger.error('Error updating background image', error as Error);
    return false;
  }
}
