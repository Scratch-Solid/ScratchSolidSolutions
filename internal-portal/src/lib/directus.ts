const DIRECTUS_URL = process.env.DIRECTUS_URL || 'http://localhost:8055';
const DIRECTUS_TOKEN = process.env.DIRECTUS_TOKEN || '';

interface DirectusResponse<T> {
  data: T;
  errors?: any[];
}

export async function getDirectusItems<T>(collection: string, params?: Record<string, any>): Promise<T[]> {
  const url = new URL(`${DIRECTUS_URL}/items/${collection}`);
  
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value));
      }
    });
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (DIRECTUS_TOKEN) {
    headers['Authorization'] = `Bearer ${DIRECTUS_TOKEN}`;
  }

  const response = await fetch(url.toString(), { headers });
  
  if (!response.ok) {
    throw new Error(`Directus error: ${response.statusText}`);
  }

  const json: DirectusResponse<{ data: T[] }> = await response.json();
  return json.data.data || [];
}

export async function getDirectusItem<T>(collection: string, id: string): Promise<T | null> {
  const url = `${DIRECTUS_URL}/items/${collection}/${id}`;
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (DIRECTUS_TOKEN) {
    headers['Authorization'] = `Bearer ${DIRECTUS_TOKEN}`;
  }

  const response = await fetch(url, { headers });
  
  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error(`Directus error: ${response.statusText}`);
  }

  const json: DirectusResponse<{ data: T }> = await response.json();
  return json.data.data || null;
}

export async function createDirectusItem<T>(collection: string, data: Partial<T>): Promise<T> {
  const url = `${DIRECTUS_URL}/items/${collection}`;
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (DIRECTUS_TOKEN) {
    headers['Authorization'] = `Bearer ${DIRECTUS_TOKEN}`;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    throw new Error(`Directus error: ${response.statusText}`);
  }

  const json: DirectusResponse<{ data: T }> = await response.json();
  return json.data.data;
}

export async function updateDirectusItem<T>(collection: string, id: string, data: Partial<T>): Promise<T> {
  const url = `${DIRECTUS_URL}/items/${collection}/${id}`;
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (DIRECTUS_TOKEN) {
    headers['Authorization'] = `Bearer ${DIRECTUS_TOKEN}`;
  }

  const response = await fetch(url, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    throw new Error(`Directus error: ${response.statusText}`);
  }

  const json: DirectusResponse<{ data: T }> = await response.json();
  return json.data.data;
}

export async function deleteDirectusItem(collection: string, id: string): Promise<void> {
  const url = `${DIRECTUS_URL}/items/${collection}/${id}`;
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (DIRECTUS_TOKEN) {
    headers['Authorization'] = `Bearer ${DIRECTUS_TOKEN}`;
  }

  const response = await fetch(url, {
    method: 'DELETE',
    headers,
  });
  
  if (!response.ok) {
    throw new Error(`Directus error: ${response.statusText}`);
  }
}
