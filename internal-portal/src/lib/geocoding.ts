// Address geocoding via OpenStreetMap Nominatim (free, no API key required).
// Nominatim's usage policy caps requests at 1/second and asks for a
// descriptive User-Agent - both are respected here. This is intentionally a
// lower-commitment choice than a paid provider (Google Maps etc.) so it can
// ship without a new billing/account decision; swap providers later if
// precision or volume needs outgrow it.

export interface GeocodeResult {
  lat: number;
  long: number;
}

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';

export async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
  if (!address || !address.trim()) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const url = `${NOMINATIM_URL}?q=${encodeURIComponent(address)}&format=json&limit=1&countrycodes=za`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'ScratchSolidSolutions-Booking/1.0 (customerservice@scratchsolidsolutions.org)',
      },
      signal: controller.signal,
    });

    if (!response.ok) return null;

    const results = await response.json() as Array<{ lat: string; lon: string }>;
    if (!results.length) return null;

    const lat = parseFloat(results[0].lat);
    const long = parseFloat(results[0].lon);
    if (Number.isNaN(lat) || Number.isNaN(long)) return null;

    return { lat, long };
  } catch (error) {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
