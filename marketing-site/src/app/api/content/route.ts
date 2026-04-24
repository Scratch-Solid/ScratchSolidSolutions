import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type") || "privacy";

    // In production, this would fetch from Directus database
    // For now, return fallback content
    const contentMap: Record<string, string> = {
      privacy: `# Privacy Policy

**Last Updated:** April 2026

## 1. Information We Collect

We collect information you provide directly to us, including:
- Personal information (name, contact details)
- Booking information
- Payment information

## 2. How We Use Your Information

We use the information we collect to:
- Provide and maintain our cleaning services
- Process bookings and payments
- Communicate with you about your bookings

## 3. Information Sharing

We do not share your personal information with third parties except as required by law or to provide our services.

## 4. Data Security

We implement reasonable security measures to protect your information.

## 5. Your Rights

You have the right to access, correct, or delete your personal information.

## 6. Contact Us

If you have questions about this privacy policy, please contact us.`,
      terms: `# Terms of Service

**Last Updated:** April 2026

## 1. Acceptance of Terms

By using our services, you agree to these terms of service.

## 2. Services

Scratch Solid Solutions provides professional cleaning services for homes and businesses.

## 3. Booking and Payment

- Bookings are confirmed upon payment or as specified
- Payment methods include cash and EFT
- Cancellations must be made at least 24 hours in advance

## 4. Service Standards

We strive to provide high-quality cleaning services. If you are not satisfied, please contact us within 24 hours.

## 5. Liability

We are not liable for damage to personal property unless caused by our negligence.

## 6. Changes to Terms

We reserve the right to modify these terms at any time.

## 7. Contact Us

For questions about these terms, please contact us.`,
      contact: `# Contact Us

**Scratch Solid Solutions**

## Contact Information

**Phone:** +27 69 673 5947
**Email:** info@scratchsolid.com
**Address:** 123 Main Road, Cape Town, South Africa

## Business Hours

Monday - Friday: 08:00 - 17:00
Saturday: 08:00 - 13:00
Sunday: Closed

## Get a Quote

Request a free quote for your cleaning needs by contacting us via phone or email.

## WhatsApp

You can also reach us via WhatsApp for quick inquiries.

## Emergency Services

For urgent cleaning needs, please call our emergency hotline.`,
    };

    const content = contentMap[type] || contentMap.privacy;

    return NextResponse.json({ content, type });
  } catch (error) {
    return NextResponse.json({ error: "Failed to load content" }, { status: 500 });
  }
}
