// directusClient.js
// Directus SDK client for frontend/backend integration

import { Directus } from '@directus/sdk';

const directusUrl = process.env.DIRECTUS_URL || 'http://localhost:8055';
const directusToken = process.env.DIRECTUS_API_TOKEN || '';

export const directus = new Directus(directusUrl, {
  auth: {
    staticToken: directusToken,
  },
});
