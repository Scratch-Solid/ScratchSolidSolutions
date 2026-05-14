import { sanitizeHtml } from '../htmlSanitizer'

describe('sanitizeHtml', () => {
  it('should remove script tags', () => {
    const input = '<script>alert("xss")</script><p>Safe content</p>'
    const result = sanitizeHtml(input)
    expect(result).not.toContain('<script>')
    expect(result).toContain('<p>Safe content</p>')
  })

  it('should remove iframe tags', () => {
    const input = '<iframe src="evil.com"></iframe><p>Safe content</p>'
    const result = sanitizeHtml(input)
    expect(result).not.toContain('<iframe')
    expect(result).toContain('<p>Safe content</p>')
  })

  it('should allow safe HTML tags', () => {
    const input = '<p>Safe content</p><strong>Bold text</strong>'
    const result = sanitizeHtml(input)
    expect(result).toContain('<p>Safe content</p>')
    expect(result).toContain('<strong>Bold text</strong>')
  })

  it('should remove onclick attributes', () => {
    const input = '<p onclick="alert()">Click me</p>'
    const result = sanitizeHtml(input)
    expect(result).not.toContain('onclick')
  })
})
