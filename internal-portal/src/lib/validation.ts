export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateEmail(email: string): ValidationResult {
  const errors: string[] = [];
  if (!email) errors.push('Email is required');
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('Invalid email format');
  return { valid: errors.length === 0, errors };
}

export function validatePassword(password: string): ValidationResult {
  const errors: string[] = [];
  if (!password) {
    errors.push('Password is required');
  } else {
    if (password.length < 8) errors.push('Password must be at least 8 characters');
    if (!/[A-Z]/.test(password)) errors.push('Password must contain at least one uppercase letter');
    if (!/[a-z]/.test(password)) errors.push('Password must contain at least one lowercase letter');
    if (!/[0-9]/.test(password)) errors.push('Password must contain at least one number');
    if (!/[^A-Za-z0-9]/.test(password)) errors.push('Password must contain at least one special character');
  }
  return { valid: errors.length === 0, errors };
}

export function validatePhone(phone: string): ValidationResult {
  const errors: string[] = [];

  if (!phone) {
    errors.push('Phone number is required');
  } else {
    // Remove all non-digit characters for validation
    const digits = phone.replace(/\D/g, '');

    // South African phone number validation
    // Format: +27 XX XXX XXXX or 0XX XXX XXXX (10 digits after country code, 11 with leading 0)
    if (digits.length === 11 && digits.startsWith('0')) {
      // Format: 0XX XXX XXXX - valid SA format
    } else if (digits.length === 10 && digits.startsWith('27')) {
      // Format: +27 XX XXX XXXX - valid SA format
    } else {
      errors.push('Invalid South African phone number. Use format: +27 XX XXX XXXX or 0XX XXX XXXX');
    }
  }

  return { valid: errors.length === 0, errors };
}

export function validateSaIdNumber(idNumber: string): ValidationResult {
  const errors: string[] = [];

  if (!idNumber) {
    errors.push('South African ID number is required');
  } else {
    // Remove spaces and dashes
    const cleaned = idNumber.replace(/[\s-]/g, '');

    // SA ID must be exactly 13 digits
    if (!/^\d{13}$/.test(cleaned)) {
      errors.push('South African ID number must be exactly 13 digits');
    } else {
      // Luhn algorithm validation
      let sum = 0;
      let alternate = false;

      for (let i = cleaned.length - 1; i >= 0; i--) {
        let digit = parseInt(cleaned.charAt(i), 10);

        if (alternate) {
          digit *= 2;
          if (digit > 9) {
            digit = Math.floor(digit / 10) + (digit % 10);
          }
        }

        sum += digit;
        alternate = !alternate;
      }

      if (sum % 10 !== 0) {
        errors.push('Invalid South African ID number - failed validation check');
      }

      // Validate date of birth (first 6 digits: YYMMDD)
      const year = parseInt(cleaned.substring(0, 2), 10);
      const month = parseInt(cleaned.substring(2, 4), 10);
      const day = parseInt(cleaned.substring(4, 6), 10);

      // Determine century (SA ID uses specific logic)
      const currentYear = new Date().getFullYear();
      const century = year > (currentYear % 100) ? 1900 : 2000;
      const fullYear = century + year;

      if (month < 1 || month > 12) {
        errors.push('Invalid month in ID number');
      } else if (day < 1 || day > 31) {
        errors.push('Invalid day in ID number');
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

export function validateSaPassport(passportNumber: string): ValidationResult {
  const errors: string[] = [];

  if (!passportNumber) {
    errors.push('Passport number is required');
  } else {
    // South African passport format: 1 letter + 8 digits (e.g., A12345678)
    // Or sometimes 2 letters + digits for newer passports
    const cleaned = passportNumber.replace(/[\s-]/g, '').toUpperCase();

    if (!/^[A-Z]{1,2}\d{8,9}$/.test(cleaned)) {
      errors.push('Invalid South African passport number. Format: 1-2 letters followed by 8-9 digits');
    }
  }

  return { valid: errors.length === 0, errors };
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

export function validateBookingDate(date: string): { valid: boolean; error?: string } {
  if (!date) return { valid: false, error: 'Date is required' };
  const d = new Date(date);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  if (isNaN(d.getTime())) return { valid: false, error: 'Invalid date format' };
  if (d < now) return { valid: false, error: 'Date must be in the future' };
  return { valid: true };
}

export function validateRequired(data: Record<string, any>, fields: string[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  for (const field of fields) {
    if (data[field] === undefined || data[field] === null || data[field] === '') {
      errors.push(`${field} is required`);
    }
  }
  return { valid: errors.length === 0, errors };
}
