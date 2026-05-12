export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { withTracing, withSecurityHeaders } from "@/lib/middleware";
import { withRateLimit, rateLimits } from "@/lib/middleware";
import { getDb } from "@/lib/db";

// Expanded in-memory knowledge base for practical Q&A
const siteContent = [
  {
    page: "Home",
    text: `GRAND OPENING! Special: R350 for 4 hours. Starting 1 May 2026. Professional, reliable, and affordable cleaning services for homes and businesses. Book your slot for only R350 during our grand opening! User Experience Features (Planned): Easy Booking: Seamless online and WhatsApp booking options. Live Chat: Real-time support for your questions. Mobile-Friendly: Optimized for all devices. More features coming soon to enhance your experience!`
  },
  {
    page: "About Us",
    text: `About Us. At Scratch Solid Solutions, we believe that a clean space is the foundation of productivity, comfort, and peace of mind. Built on the promise of reliability and excellence, our company delivers professional cleaning services that leave every surface spotless and scratch-free. Our team is dedicated to providing tailored cleaning solutions for homes, offices, and commercial spaces. Whether it’s routine maintenance or deep cleaning, we approach every job with precision, care, and a commitment to the highest standards. With our slogan, “Scratch-Free, Solidly Clean,” we embody the values of trust, strength, and attention to detail. Our Mission: To deliver spotless, reliable cleaning services that create healthy, productive, and welcoming environments for our clients. Our Vision: To be the most trusted and innovative cleaning solutions provider, setting new standards for quality, sustainability, and customer satisfaction. Our Values: Trust, Excellence, Attention to Detail, Eco-Consciousness, Customer-First. We don’t just clean — we create environments where people can thrive. By combining modern techniques, eco-conscious practices, and a customer-first mindset, Scratch Solid Solutions ensures that every client enjoys a space that feels fresh, safe, and welcoming. Solid solutions. Spotless results. Every time.`
  },
  {
    page: "Services",
    text: `Our Services: Residential Cleaning: Homes, apartments, and complexes. Office Cleaning: Workspaces, offices, and business premises. Deep Cleaning: Intensive cleaning for kitchens, bathrooms, carpets, and more. Move-In/Move-Out Cleaning: End-of-lease and pre-occupancy cleaning. Custom Cleaning: Tailored solutions for unique needs. Contact us for a detailed quote or to discuss your specific requirements!`
  },
  // Practical Q&A
  {
    page: "Q&A",
    text: `🧹 Service Information\n- Deep Clean: Includes thorough cleaning of kitchens, bathrooms, carpets, and all living areas.\n- Yes, we clean both offices and homes!\n\nPricing: Our grand opening special is R350 for 4 hours. Standard rates may vary—contact us for details.\n\nCustom Quotes: We offer tailored estimates based on your space and needs. Just ask for a quote!\n\n📅 Booking & Scheduling\n- You can book for any available date, including weekends.\n- Book online, via WhatsApp, or contact us directly.\n- We send confirmations and reminders for your appointments.\n\n🛡️ Trust & Professionalism\n- We are fully insured and use eco-friendly products.\n- Our team is highly trained, professional, and background-checked.\n- We handle delicate surfaces with care—our motto is “Scratch-Free, Solidly Clean.”`
  }
];

function searchContent(query: string) {
  const q = query.toLowerCase();
  let results: { page: string; text: string }[] = [];
  for (const entry of siteContent) {
    if (entry.text.toLowerCase().includes(q)) {
      results.push(entry);
    }
  }
  return results;
}

export async function POST(req: NextRequest) {
  const traceId = withTracing(req);

  // Rate limiting check
  const rateLimitResult = await withRateLimit(req, rateLimits.standard);
  if (rateLimitResult && !rateLimitResult.success) {
    return withSecurityHeaders(
      NextResponse.json(
        { error: 'Too many chatbot requests. Please try again later.' },
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

  const body = await req.json() as { question?: string };
  const { question } = body;
  if (!question || typeof question !== "string") {
    const response = NextResponse.json({ error: "No question provided." }, { status: 400 });
    return withSecurityHeaders(response, traceId);
  }

  try {
    const db = await getDb();
    if (!db) {
      const response = NextResponse.json({ 
        answer: "Sorry, I'm having trouble processing your request right now. Please contact us on WhatsApp at +27 69 673 5947." 
      });
      return withSecurityHeaders(response, traceId);
    }

    // Normalize input: lowercase and remove punctuation
    const input = question.toLowerCase().replace(/[?!.]/g, '').trim();

    // Check for exact matches first
    const exactMatch = await db.prepare(
      `SELECT response FROM ai_responses WHERE LOWER(REPLACE(REPLACE(question, '?', ''), '!', '')) = ? LIMIT 1`
    ).bind(input).first();

    if (exactMatch) {
      const response = NextResponse.json({ answer: exactMatch.response as string });
      return withSecurityHeaders(response, traceId);
    }

    // Check for keyword matches using LIKE
    const keywordMatch = await db.prepare(
      `SELECT response FROM ai_responses WHERE LOWER(question) LIKE ? LIMIT 1`
    ).bind(`%${input}%`).first();

    if (keywordMatch) {
      const response = NextResponse.json({ answer: keywordMatch.response as string });
      return withSecurityHeaders(response, traceId);
    }

    // Default response
    const response = NextResponse.json({ 
      answer: "Sorry, I couldn't find an answer. Please contact us on WhatsApp at +27 69 673 5947 for assistance." 
    });
    return withSecurityHeaders(response, traceId);
  } catch (error) {
    const response = NextResponse.json({ 
      answer: "Sorry, I'm having trouble processing your request right now. Please contact us on WhatsApp at +27 69 673 5947." 
    });
    return withSecurityHeaders(response, traceId);
  }
}
