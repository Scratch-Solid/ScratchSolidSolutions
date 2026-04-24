// Update a Gallery Image (admin inline edit)
export async function updateGalleryImage(data) {
  if (!data.id) throw new Error("No Gallery Image ID");
  await directus.items('gallery_images').updateOne(data.id, data);
}
// Update Contact Info (admin inline edit)
export async function updateContactInfo(data) {
  const contact = await getContactInfo();
  if (!contact || !contact.id) throw new Error("No Contact Info record found");
  await directus.items('contact_info').updateOne(contact.id, data);
}
// Update a Promotion (admin inline edit)
export async function updatePromotion(data) {
  if (!data.id) throw new Error("No Promotion ID");
  await directus.items('promotions').updateOne(data.id, data);
}
// Update a Home Tile (admin inline edit)
export async function updateHomeTile(data) {
  if (!data.id) throw new Error("No Home Tile ID");
  await directus.items('home_tiles').updateOne(data.id, data);
}
// Update a Service (admin inline edit)
export async function updateService(data) {
  if (!data.id) throw new Error("No Service ID");
  await directus.items('services').updateOne(data.id, data);
}
// Update About Us (admin inline edit)
export async function updateAboutUs(data) {
  // Assumes only one about_us record (id=1 or first)
  const about = await getAboutUs();
  if (!about || !about.id) throw new Error("No About Us record found");
  await directus.items('about_us').updateOne(about.id, data);
}
// Example: Fetch About Us content from Directus

import { directus } from './directusClient';

// Simple in-memory cache (per serverless instance)
const _cache = {};
const CACHE_TTL = 60 * 1000; // 1 minute

function cacheGet(key) {
  const entry = _cache[key];
  if (!entry) return undefined;
  if (Date.now() - entry.time > CACHE_TTL) {
    delete _cache[key];
    return undefined;
  }
  return entry.value;
}

function cacheSet(key, value) {
  _cache[key] = { value, time: Date.now() };
}

// Fallbacks (minimal, can be expanded)
const FALLBACKS = {
  about_us: [{
    intro: "We deliver spotless, reliable cleaning services for homes and businesses.",
    mission: "To deliver spotless, reliable cleaning services that create healthy, productive, and welcoming environments for our clients.",
    vision: "To be the most trusted and innovative cleaning solutions provider, setting new standards for quality, sustainability, and customer satisfaction.",
    values: ["Trust", "Excellence", "Attention to Detail", "Eco-Consciousness", "Customer-First"],
    outro: "We don’t just clean — we create environments where people can thrive.",
    slogan: "Solid solutions. Spotless results. Every time."
  }],
  services: [
    { title: "Residential Cleaning", description: "Homes, apartments, and complexes" },
    { title: "Office Cleaning", description: "Workspaces, offices, and business premises" }
  ],
  home_tiles: [
    { title: "Grand Opening Special", subtitle: "R350 for 4 hours", image: "promo.jpg", link: "/book", order: 1 },
    { title: "Book a Cleaner", subtitle: "Fast, easy, reliable", image: "book.jpg", link: "/book", order: 2 }
  ],
  promotions: [
    { title: "Winter Deep Clean Discount", description: "Get 20% off all deep cleans this winter. Book now!", image: "winter.jpg", start_date: "2026-06-01", end_date: "2026-08-31", active: true }
  ],
  contact_info: [{ phone: "+27 69 673 5947", email: "info@scratchsolid.com", whatsapp_link: "https://wa.me/27696735947", address: "123 Main Road, Cape Town", show_contact_button: true }],
  gallery_images: [
    { url: "example1.jpg", caption: "Sparkling kitchen after deep clean", alt_text: "Clean kitchen", order: 1 },
    { url: "example2.jpg", caption: "Office space ready for work", alt_text: "Clean office", order: 2 }
  ],
  background_images: [
    { url: "/default-bg.jpg", section: "marketing", active: true },
    { url: "/default-bg.jpg", section: "booking", active: true },
    { url: "/default-bg.jpg", section: "dashboard", active: true }
  ]
};

export async function getAboutUs() {
  const key = 'about_us';
  const cached = cacheGet(key);
  if (cached) return cached;
  try {
    const result = await directus.items('about_us').readByQuery({ limit: 1 });
    const data = result.data?.[0] || null;
    if (data) cacheSet(key, data);
    return data || FALLBACKS.about_us[0];
  } catch {
    return FALLBACKS.about_us[0];
  }
}

// Example: Fetch Gallery Images
export async function getGalleryImages() {
  const key = 'gallery_images';
  const cached = cacheGet(key);
  if (cached) return cached;
  try {
    const result = await directus.items('gallery_images').readByQuery({ sort: ['order'] });
    const data = result.data || [];
    cacheSet(key, data);
    return data.length ? data : FALLBACKS.gallery_images;
  } catch {
    return FALLBACKS.gallery_images;
  }
}

// Example: Fetch Home Tiles
export async function getHomeTiles() {
  const key = 'home_tiles';
  const cached = cacheGet(key);
  if (cached) return cached;
  try {
    const result = await directus.items('home_tiles').readByQuery({ sort: ['order'] });
    const data = result.data || [];
    cacheSet(key, data);
    return data.length ? data : FALLBACKS.home_tiles;
  } catch {
    return FALLBACKS.home_tiles;
  }
}

// Example: Fetch Promotions
export async function getPromotions() {
  const key = 'promotions';
  const cached = cacheGet(key);
  if (cached) return cached;
  try {
    const result = await directus.items('promotions').readByQuery({ filter: { active: { _eq: true } } });
    const data = result.data || [];
    cacheSet(key, data);
    return data.length ? data : FALLBACKS.promotions;
  } catch {
    return FALLBACKS.promotions;
  }
}

// Example: Fetch Contact Info
export async function getContactInfo() {
  const key = 'contact_info';
  const cached = cacheGet(key);
  if (cached) return cached;
  try {
    const result = await directus.items('contact_info').readByQuery({ limit: 1 });
    const data = result.data?.[0] || null;
    if (data) cacheSet(key, data);
    return data || FALLBACKS.contact_info[0];
  } catch {
    return FALLBACKS.contact_info[0];
  }
}

// Example: Fetch Indemnity Form
export async function getIndemnityForm() {
  const result = await directus.items('indemnity_form').readByQuery({ filter: { active: { _eq: true } }, limit: 1 });
  return result.data?.[0] || null;
}

// Example: Fetch Bulk Messages
export async function getBulkMessages() {
  const result = await directus.items('bulk_messages').readByQuery({ filter: { sent: { _eq: false } } });
  return result.data || [];
}

// Example: Fetch Business Contracts
export async function getBusinessContracts() {
  const result = await directus.items('business_contracts').readByQuery({ filter: { active: { _eq: true } } });
  return result.data || [];
}

// Fetch Services
export async function getServices() {
  const key = 'services';
  const cached = cacheGet(key);
  if (cached) return cached;
  try {
    const result = await directus.items('services').readByQuery({ sort: ['order'] });
    const data = result.data || [];
    cacheSet(key, data);
    return data.length ? data : FALLBACKS.services;
  } catch {
    return FALLBACKS.services;
  }
}

// Fetch Background Images
export async function getBackgroundImages() {
  const key = 'background_images';
  const cached = cacheGet(key);
  if (cached) return cached;
  try {
    const result = await directus.items('background_images').readByQuery({
      limit: 20,
      fields: ['*'],
      sort: ['sort']
    });
    
    if (result.data && result.data.length > 0) {
      const data = result.data.map(img => ({
        id: img.id,
        name: img.name,
        url: img.image ? `${process.env.NEXT_PUBLIC_DIRECTUS_URL}/assets/${img.image}` : null,
        page: img.page || 'home',
        is_active: img.status === 'published'
      }));
      cacheSet(key, data);
      return data;
    }
    
    cacheSet(key, FALLBACKS.background_images);
    return FALLBACKS.background_images;
  } catch {
    return FALLBACKS.background_images;
  }
}
