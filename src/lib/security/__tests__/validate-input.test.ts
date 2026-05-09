import { describe, it, expect } from 'vitest';
import { detectXSS, containsXSS } from '../validate-input';

describe('detectXSS', () => {
  it('detects <script> tags', () => {
    expect(detectXSS('<script>alert(1)</script>')).toBe(true);
    expect(detectXSS('<script >alert(1)</script>')).toBe(true);
  });

  it('detects javascript: URLs', () => {
    expect(detectXSS('javascript:alert(1)')).toBe(true);
  });

  it('detects event handlers', () => {
    expect(detectXSS('onclick=alert(1)')).toBe(true);
    expect(detectXSS('onerror=alert(1)')).toBe(true);
    expect(detectXSS('onload=alert(1)')).toBe(true);
  });

  it('detects data:text/html', () => {
    expect(detectXSS('data:text/html,<script>alert(1)</script>')).toBe(true);
  });

  it('detects iframe tags', () => {
    expect(detectXSS('<iframe src="http://evil.com"></iframe>')).toBe(true);
  });

  it('detects object tags', () => {
    expect(detectXSS('<object data="http://evil.com"></object>')).toBe(true);
  });

  it('detects embed tags', () => {
    expect(detectXSS('<embed src="http://evil.com"></embed>')).toBe(true);
  });

  it('detects SVG tags', () => {
    expect(detectXSS('<svg onload=alert(1)>')).toBe(true);
  });

  it('detects img with onerror', () => {
    expect(detectXSS('<img src="x" onerror=alert(1)>')).toBe(true);
  });

  it('detects document.cookie access', () => {
    expect(detectXSS('document.cookie')).toBe(true);
  });

  it('detects vbscript: URLs', () => {
    expect(detectXSS('vbscript:msgbox("xss")')).toBe(true);
  });

  it('detects CSS expression', () => {
    expect(detectXSS('expression(alert(1))')).toBe(true);
  });

  it('allows safe strings', () => {
    expect(detectXSS('Hello World')).toBe(false);
    expect(detectXSS('สวัสดี')).toBe(false);
    expect(detectXSS('normal text with numbers 123')).toBe(false);
  });

  it('allows empty string', () => {
    expect(detectXSS('')).toBe(false);
  });

  it('allows strings with only safe HTML entities', () => {
    expect(detectXSS('1 < 2 and 2 > 1')).toBe(false);
  });
});

describe('containsXSS', () => {
  it('detects XSS in plain strings', () => {
    expect(containsXSS('<script>alert(1)</script>')).toBe(true);
  });

  it('detects XSS in array elements', () => {
    expect(containsXSS(['safe', '<script>alert(1)</script>', 'also safe'])).toBe(true);
  });

  it('detects XSS in object values', () => {
    expect(containsXSS({ name: 'John', bio: '<script>alert(1)</script>' })).toBe(true);
  });

  it('detects XSS in nested objects', () => {
    expect(containsXSS({
      user: {
        name: 'John',
        profile: {
          bio: '<script>alert(1)</script>',
        },
      },
    })).toBe(true);
  });

  it('returns false for safe objects', () => {
    expect(containsXSS({
      name: 'John',
      age: 30,
      tags: ['student', 'active'],
    })).toBe(false);
  });

  it('handles null values', () => {
    expect(containsXSS(null)).toBe(false);
  });

  it('handles undefined values', () => {
    expect(containsXSS(undefined)).toBe(false);
  });

  it('handles number values', () => {
    expect(containsXSS(123)).toBe(false);
  });

  it('handles boolean values', () => {
    expect(containsXSS(true)).toBe(false);
  });

  it('handles empty object', () => {
    expect(containsXSS({})).toBe(false);
  });

  it('handles empty array', () => {
    expect(containsXSS([])).toBe(false);
  });
});
