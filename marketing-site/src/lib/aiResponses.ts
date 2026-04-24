// AI Assistant Responses Data
// Uses Cloudflare D1 database for AI response storage

import type { D1Database } from '@cloudflare/workers-types';
import { logger } from './logger';

export interface AIResponse {
  id: number;
  question: string;
  response: string;
}

export async function getAIResponse(db: D1Database, userInput: string): Promise<string> {
  try {
    const input = userInput.toLowerCase();
    
    // Check for exact matches first
    const exactMatch = await db.prepare(
      `SELECT response FROM ai_responses WHERE LOWER(question) = ? LIMIT 1`
    ).bind(input).first();
    
    if (exactMatch) {
      return exactMatch.response as string;
    }
    
    // Check for keyword matches
    if (input.includes('price') || input.includes('cost') || input.includes('how much')) {
      const result = await db.prepare(
        `SELECT response FROM ai_responses WHERE question LIKE '%cost%' LIMIT 1`
      ).first();
      if (result) return result.response as string;
    }
    
    if (input.includes('book') || input.includes('appointment') || input.includes('schedule')) {
      const result = await db.prepare(
        `SELECT response FROM ai_responses WHERE question LIKE '%book%' LIMIT 1`
      ).first();
      if (result) return result.response as string;
    }
    
    if (input.includes('service') || input.includes('offer') || input.includes('clean')) {
      const result = await db.prepare(
        `SELECT response FROM ai_responses WHERE question LIKE '%service%' LIMIT 1`
      ).first();
      if (result) return result.response as string;
    }
    
    if (input.includes('insure') || input.includes('insurance') || input.includes('safe')) {
      const result = await db.prepare(
        `SELECT response FROM ai_responses WHERE question LIKE '%insure%' LIMIT 1`
      ).first();
      if (result) return result.response as string;
    }
    
    if (input.includes('area') || input.includes('location') || input.includes('where')) {
      const result = await db.prepare(
        `SELECT response FROM ai_responses WHERE question LIKE '%area%' LIMIT 1`
      ).first();
      if (result) return result.response as string;
    }
    
    // Default response
    const defaultResponse = await db.prepare(
      `SELECT response FROM ai_responses WHERE question LIKE '%default%' LIMIT 1`
    ).first();
    
    if (defaultResponse) {
      return defaultResponse.response as string;
    }
    
    return "Thank you for your question! Our team offers professional cleaning services starting from R350. You can book a service through our website or contact us via WhatsApp at +27 69 673 5947. Is there anything specific about our cleaning services you'd like to know more about?";
  } catch (error) {
    logger.error('Error fetching AI response', error as Error);
    return "I apologize, but I'm having trouble processing your request right now. Please try again or contact us directly at +27 69 673 5947.";
  }
}

export async function getAllAIResponses(db: D1Database): Promise<AIResponse[]> {
  try {
    const results = await db.prepare(
      `SELECT id, question, response FROM ai_responses ORDER BY id`
    ).all();

    return results.results.map(row => ({
      id: row.id as number,
      question: row.question as string,
      response: row.response as string
    }));
  } catch (error) {
    logger.error('Error fetching all AI responses', error as Error);
    return [];
  }
}
