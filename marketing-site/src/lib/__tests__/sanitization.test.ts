import {
  sanitizeHTML,
  sanitizeText,
  sanitizeEmail,
  sanitizePhone,
  sanitizeURL,
  sanitizeFileName,
  escapeHTML
} from '../sanitization';

describe('XSS & Input Sanitization', () => {
  describe('sanitizeHTML', () => {
    it('should remove script tags', () => {
      const input = '<script>alert("xss")</script><p>Safe</p>';
      const result = sanitizeHTML(input);
      expect(result).not.toContain('<script>');
      expect(result).toContain('<p>Safe</p>');
    });

    it('should remove iframe tags', () => {
      const input = '<iframe src="evil.com"></iframe><p>Safe</p>';
      const result = sanitizeHTML(input);
      expect(result).not.toContain('<iframe');
      expect(result).toContain('<p>Safe</p>');
    });

    it('should remove event handlers', () => {
      const input = '<p onclick="alert()">Click</p>';
      const result = sanitizeHTML(input);
      expect(result).not.toContain('onclick');
    });

    it('should remove javascript: protocol', () => {
      const input = '<a href="javascript:alert()">Link</a>';
      const result = sanitizeHTML(input);
      expect(result).not.toContain('javascript:');
    });

    it('should handle empty input', () => {
      expect(sanitizeHTML('')).toBe('');
      expect(sanitizeHTML(null as any)).toBe('');
    });
  });

  describe('sanitizeText', () => {
    it('should remove control characters', () => {
      const input = 'hello\x00world';
      const result = sanitizeText(input);
      expect(result).not.toContain('\x00');
      expect(result).toBe('helloworld');
    });

    it('should trim whitespace', () => {
      expect(sanitizeText('  hello  ')).toBe('hello');
    });
  });

  describe('sanitizeEmail', () => {
    it('should normalize to lowercase', () => {
      expect(sanitizeEmail('Test@Example.COM')).toBe('test@example.com');
    });

    it('should reject invalid email', () => {
      expect(sanitizeEmail('not-an-email')).toBe('');
    });

    it('should handle empty input', () => {
      expect(sanitizeEmail('')).toBe('');
    });
  });

  describe('sanitizePhone', () => {
    it('should remove non-numeric characters', () => {
      expect(sanitizePhone('+27 69 673 5947')).toBe('+27696735947');
    });

    it('should handle empty input', () => {
      expect(sanitizePhone('')).toBe('');
    });
  });

  describe('sanitizeURL', () => {
    it('should accept https URL', () => {
      expect(sanitizeURL('https://example.com')).toBe('https://example.com/');
    });

    it('should reject non-http protocols', () => {
      expect(sanitizeURL('javascript:alert()')).toBe('');
    });

    it('should handle empty input', () => {
      expect(sanitizeURL('')).toBe('');
    });
  });

  describe('sanitizeFileName', () => {
    it('should remove path traversal', () => {
      expect(sanitizeFileName('../../../etc/passwd')).toBe('passwd');
    });

    it('should remove dangerous characters', () => {
      expect(sanitizeFileName('file<name>.txt')).toBe('filename.txt');
    });
  });

  describe('escapeHTML', () => {
    it('should escape HTML entities', () => {
      const result = escapeHTML('<script>alert("xss")</script>');
      expect(result).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
    });

    it('should handle empty input', () => {
      expect(escapeHTML('')).toBe('');
    });
  });
});
