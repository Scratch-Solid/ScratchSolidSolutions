/**
 * @module htmlSanitizer
 * @description HTML sanitization for admin-sourced content to prevent XSS.
 *
 * Uses DOMPurify to strip dangerous tags/attributes while allowing safe
 * formatting (headings, paragraphs, lists, links, etc.).
 *
 * Use this before passing HTML to dangerouslySetInnerHTML.
 */

import DOMPurify from 'dompurify';

/**
 * Sanitizes HTML content to prevent XSS attacks.
 *
 * Allows safe tags: headings, paragraphs, lists, links, bold, italic, etc.
 * Blocks dangerous tags: script, iframe, object, embed, form, input, etc.
 * Blocks dangerous attributes: onclick, onerror, javascript:, etc.
 *
 * @param html Raw HTML string (typically from admin content management).
 * @returns Sanitized HTML safe to render with dangerouslySetInnerHTML.
 */
export function sanitizeHtml(html: string): string {
  if (!html || typeof html !== 'string') return '';

  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'p', 'br', 'hr',
      'strong', 'b', 'em', 'i', 'u', 's', 'sub', 'sup',
      'ul', 'ol', 'li',
      'a',
      'blockquote',
      'code', 'pre',
      'table', 'thead', 'tbody', 'tr', 'th', 'td',
    ],
    ALLOWED_ATTR: ['href', 'title', 'target', 'rel'],
    ALLOW_DATA_ATTR: false,
    FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form', 'input', 'button'],
    FORBID_ATTR: ['onclick', 'onerror', 'onload', 'onmouseover', 'onfocus', 'onblur'],
  });
}
