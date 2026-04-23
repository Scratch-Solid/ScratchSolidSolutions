// Database Content Management for Marketing Site
// This will be replaced with Directus API calls

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

// Mock database content - will be replaced with Directus API
const mockContentPages: ContentPage[] = [
  {
    id: "1",
    title: "Privacy Policy",
    slug: "privacy",
    content: `# Privacy Policy

**Effective Date:** March 2024

## Information We Collect

We collect information you provide directly to us, such as when you create an account, use our services, or contact us for support.

### Personal Information
- Name, email address, phone number
- Physical address for service delivery
- Payment information (processed securely)

### Service Information
- Cleaning preferences and requirements
- Service history and scheduling
- Feedback and reviews

## How We Use Your Information

We use the information we collect to:
- Provide and maintain our cleaning services
- Process payments and manage your account
- Communicate with you about your services
- Improve our services and develop new features

## Information Sharing

We do not sell, trade, or otherwise transfer your personal information to third parties without your consent, except as described in this policy.

### Service Providers
We may share information with trusted third-party service providers who assist us in operating our business.

### Legal Requirements
We may disclose your information if required by law or in good faith belief that such action is necessary.

## Data Security

We implement appropriate security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.

## Your Rights

You have the right to:
- Access and update your personal information
- Request deletion of your account and data
- Opt-out of marketing communications

## Contact Us

If you have any questions about this Privacy Policy, please contact us at:
- Email: privacy@scratchsolid.co.za
- Phone: +27 69 673 5947

## Changes to This Policy

We may update this privacy policy from time to time. We will notify you of any changes by posting the new policy on this page.`,
    lastUpdated: "2024-03-15"
  },
  {
    id: "2",
    title: "Terms of Service",
    slug: "terms",
    content: `# Terms of Service

**Effective Date:** March 2024

## Acceptance of Terms

By accessing and using Scratch Solid Solutions' services, you accept and agree to be bound by the terms and provision of this agreement.

## Services Description

Scratch Solid Solutions provides professional cleaning services including:
- Regular home cleaning
- Deep cleaning services
- Commercial cleaning
- Move-in/move-out cleaning
- Specialized cleaning services

## User Responsibilities

As a user of our services, you agree to:
- Provide accurate information when booking services
- Ensure access to the premises during scheduled cleaning times
- Remove valuables and fragile items before cleaning
- Provide feedback on service quality

## Payment Terms

### Pricing
- Service prices are as quoted at the time of booking
- Prices are subject to change with notice
- Additional charges may apply for special requests

### Payment Methods
- We accept cash, bank transfers, and online payments
- Payment is due upon completion of services
- Late payments may incur additional fees

## Cancellation Policy

### Cancellation Notice
- 24-hour notice required for cancellations
- Late cancellations may incur a fee
- Emergency cancellations considered on case-by-case basis

### Refunds
- Refunds provided for unsatisfactory service
- Refund requests must be made within 24 hours
- Service issues will be addressed promptly

## Liability and Limitations

### Service Liability
- We are not responsible for pre-existing damage
- We are not liable for items left in cleaning areas
- We maintain insurance coverage for accidental damage

### Limitation of Liability
- Our liability is limited to the cost of the service
- We are not liable for indirect or consequential damages

## Confidentiality

We maintain confidentiality of all client information and will not share your details with third parties without consent.

## Termination

Either party may terminate the service agreement with:
- 30-day notice for ongoing services
- Immediate notice for cause
- No penalty for reasonable termination

## Dispute Resolution

All disputes will be resolved through:
1. Direct communication and negotiation
2. Mediation if necessary
3. Legal action as last resort

## Contact Information

For questions about these terms:
- Email: terms@scratchsolid.co.za
- Phone: +27 69 673 5947
- Address: Johannesburg, South Africa

## Changes to Terms

We reserve the right to modify these terms. Changes will be communicated to clients and posted on our website.`,
    lastUpdated: "2024-03-15"
  },
  {
    id: "3",
    title: "Contact Us",
    slug: "contact",
    content: `# Contact Scratch Solid Solutions

## Get in Touch

We're here to help with all your cleaning needs. Reach out to us through any of the following channels:

## Phone Support
**Main Line:** +27 69 673 5947
**Hours:** Monday - Friday, 8:00 AM - 6:00 PM
**Weekend:** 9:00 AM - 4:00 PM

## Email Support
**General Inquiries:** info@scratchsolid.co.za
**Booking Requests:** bookings@scratchsolid.co.za
**Support:** support@scratchsolid.co.za
**Response Time:** Within 24 hours

## WhatsApp
**WhatsApp:** +27 69 673 5947
**Available:** Monday - Sunday, 8:00 AM - 8:00 PM
**Quick Response:** Usually within 1 hour

## Physical Address
**Service Area:** Greater Johannesburg, Gauteng
**Coverage Areas:**
- Johannesburg CBD
- Sandton
- Randburg
- Midrand
- Pretoria (selected areas)
- East Rand

## Office Hours
**Monday - Friday:** 8:00 AM - 6:00 PM
**Saturday:** 9:00 AM - 4:00 PM
**Sunday:** 10:00 AM - 2:00 PM
**Public Holidays:** Limited service

## Emergency Services
For urgent cleaning needs outside regular hours:
- Call: +27 69 673 5947
- Additional charges may apply
- Subject to availability

## Social Media
**Facebook:** @ScratchSolidSolutions
**Instagram:** @scratchsolid.za
**LinkedIn:** Scratch Solid Solutions

## Booking Process

1. **Initial Contact**
   - Call, WhatsApp, or email us
   - Describe your cleaning needs
   - Get a free quote

2. **Scheduling**
   - Choose your preferred date and time
   - Confirm service details
   - Receive booking confirmation

3. **Service Day**
   - Our team arrives on time
   - Professional cleaning service
   - Quality inspection

4. **Follow-up**
   - Service completion report
   - Customer satisfaction check
   - Feedback collection

## Frequently Asked Questions

**Q: How far in advance should I book?**
A: We recommend booking 3-5 days in advance for regular services. Emergency services may be available within 24 hours.

**Q: Do you provide cleaning supplies?**
A: Yes, we bring all necessary cleaning supplies and equipment. Eco-friendly options available upon request.

**Q: What payment methods do you accept?**
A: We accept cash, bank transfers, and major credit cards. Payment is due upon service completion.

**Q: Are your cleaners insured?**
A: Yes, all our cleaners are fully insured and background-checked for your peace of mind.

**Q: What if I need to cancel or reschedule?**
A: Please provide at least 24 hours notice. Late cancellations may incur a fee.

## Customer Support

Our dedicated support team is ready to help you with:
- Booking inquiries
- Service modifications
- Feedback and complaints
- Emergency requests

## Business Inquiries

For partnerships, bulk services, or commercial cleaning:
- Email: business@scratchsolid.co.za
- Phone: +27 69 673 5947

We look forward to serving you!`,
    lastUpdated: "2024-03-15"
  }
];

const mockBackgroundImages: BackgroundImage[] = [
  {
    id: "1",
    url: "/scratchsolid-logo.jpg",
    name: "Main Logo Background",
    isActive: true
  }
];

// API Functions - will be replaced with Directus API calls
export async function getContentPage(slug: string): Promise<ContentPage | null> {
  // Simulate API call
  return new Promise((resolve) => {
    setTimeout(() => {
      const page = mockContentPages.find(p => p.slug === slug);
      resolve(page || null);
    }, 100);
  });
}

export async function getAllContentPages(): Promise<ContentPage[]> {
  // Simulate API call
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(mockContentPages);
    }, 100);
  });
}

export async function updateContentPage(slug: string, content: string): Promise<boolean> {
  // Simulate API call
  return new Promise((resolve) => {
    setTimeout(() => {
      const page = mockContentPages.find(p => p.slug === slug);
      if (page) {
        page.content = content;
        page.lastUpdated = new Date().toISOString().split('T')[0];
        resolve(true);
      } else {
        resolve(false);
      }
    }, 100);
  });
}

export async function getActiveBackgroundImage(): Promise<BackgroundImage | null> {
  // Simulate API call
  return new Promise((resolve) => {
    setTimeout(() => {
      const bg = mockBackgroundImages.find(img => img.isActive);
      resolve(bg || null);
    }, 100);
  });
}

export async function updateBackgroundImage(imageUrl: string): Promise<boolean> {
  // Simulate API call
  return new Promise((resolve) => {
    setTimeout(() => {
      mockBackgroundImages.forEach(img => img.isActive = false);
      mockBackgroundImages.push({
        id: Date.now().toString(),
        url: imageUrl,
        name: "Updated Background",
        isActive: true
      });
      resolve(true);
    }, 100);
  });
}
