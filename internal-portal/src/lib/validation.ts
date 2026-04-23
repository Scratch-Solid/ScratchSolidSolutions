export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (password.length < 8) errors.push('Password must be at least 8 characters');
  if (!/[A-Z]/.test(password)) errors.push('Password must contain at least one uppercase letter');
  if (!/[a-z]/.test(password)) errors.push('Password must contain at least one lowercase letter');
  if (!/[0-9]/.test(password)) errors.push('Password must contain at least one number');
  if (!/[^A-Za-z0-9]/.test(password)) errors.push('Password must contain at least one special character');
  return { valid: errors.length === 0, errors };
}

export function validatePhone(phone: string): boolean {
  return /^[0-9+\-\s()]{10,20}$/.test(phone);
}

export function sanitizeInput(input: string): string {
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/&/g, '&amp;');
}

export function sanitizeHtml(html: string): string {
  const allowed = new Set(['br', 'p', 'strong', 'em', 'ul', 'ol', 'li', 'h1', 'h2', 'h3']);
  return html.replace(/<\/?([a-z0-9]+)[^>]*>/gi, (match, tag) => allowed.has(tag.toLowerCase()) ? match : '');
}

export function validateBookingDate(date: string): boolean {
  const d = new Date(date);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return d >= now && !isNaN(d.getTime());
}

export function validateRequired(data: Record<string, any>, fields: string[]): string[] {
  return fields.filter(f => data[f] === undefined || data[f] === null || data[f] === '');
}
