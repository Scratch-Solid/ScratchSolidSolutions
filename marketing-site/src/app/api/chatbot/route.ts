import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

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
  const { question } = await req.json();
  if (!question || typeof question !== "string") {
    return NextResponse.json({ error: "No question provided." }, { status: 400 });
  }
  const results = searchContent(question);
  if (results.length === 0) {
    return NextResponse.json({ answer: "Sorry, I couldn't find an answer in our site content." });
  }
  // Return the first relevant snippet
  return NextResponse.json({ answer: results[0].text });
}
