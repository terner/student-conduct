import { describe, it, expect } from 'vitest';
import {
  escapeHtml,
  escapeAttribute,
  escapeJs,
  sanitizeUrl,
  stripHtml,
  sanitizeDisplayName,
  sanitizeNote,
  sanitizeCsvCell,
  sanitizeFilePath,
  sanitizeSearchQuery,
  isValidStudentId,
  isValidPhone,
  sanitizeNotification,
} from '../sanitize';

describe('escapeHtml', () => {
  it('escapes HTML special characters', () => {
    const input = `<script>alert("xss")</script>'`;
    const output = escapeHtml(input);
    expect(output).not.toContain('<');
    expect(output).not.toContain('>');
    expect(output).not.toContain('"');
    expect(output).toContain('&lt;');
    expect(output).toContain('&gt;');
    expect(output).toContain('&quot;');
  });

  it('returns empty string for empty input', () => {
    expect(escapeHtml('')).toBe('');
  });

  it('leaves safe strings unchanged', () => {
    expect(escapeHtml('Hello World')).toBe('Hello World');
    expect(escapeHtml('สวัสดี')).toBe('สวัสดี');
  });

  it('encodes ampersand first', () => {
    expect(escapeHtml('A&B')).toBe('A&amp;B');
  });
});

describe('escapeAttribute', () => {
  it('escapes attribute-special characters', () => {
    const output = escapeAttribute('hello"world');
    expect(output).toContain('&quot;');
  });

  it('escapes backtick and equals sign', () => {
    const input = '`=';
    const output = escapeAttribute(input);
    expect(output).toContain('&#x60;');
    expect(output).toContain('&#x3D;');
  });
});

describe('escapeJs', () => {
  it('escapes backslash, quotes, and newlines', () => {
    const output = escapeJs("test'\"\\\n\r");
    expect(output).toContain("\\'");
    expect(output).toContain('\\"');
    expect(output).toContain('\\\\');
    expect(output).toContain('\\n');
    expect(output).toContain('\\r');
  });

  it('escapes closing script tag', () => {
    const output = escapeJs('</script>');
    expect(output).toContain('<\\/script>');
  });
});

describe('sanitizeUrl', () => {
  it('allows http URLs', () => {
    expect(sanitizeUrl('http://example.com')).toBe('http://example.com');
  });

  it('allows https URLs', () => {
    expect(sanitizeUrl('https://example.com')).toBe('https://example.com');
  });

  it('allows mailto URLs', () => {
    expect(sanitizeUrl('mailto:test@example.com')).toBe('mailto:test@example.com');
  });

  it('allows tel URLs', () => {
    expect(sanitizeUrl('tel:0812345678')).toBe('tel:0812345678');
  });

  it('blocks javascript: URLs', () => {
    expect(sanitizeUrl('javascript:alert(1)')).toBeNull();
  });

  it('blocks data: URLs', () => {
    expect(sanitizeUrl('data:text/html,<script>alert(1)</script>')).toBeNull();
  });

  it('blocks vbscript: URLs', () => {
    expect(sanitizeUrl('vbscript:msgbox("xss")')).toBeNull();
  });

  it('returns null for invalid URLs', () => {
    expect(sanitizeUrl('not a url')).toBeNull();
  });
});

describe('stripHtml', () => {
  it('removes all HTML tags', () => {
    expect(stripHtml('<p>Hello <b>World</b></p>')).toBe('Hello World');
  });

  it('removes script tags (leaves content since stripTags only removes tags, not content)', () => {
    expect(stripHtml('<script>alert("xss")</script>')).toBe('alert("xss")');
  });

  it('handles empty string', () => {
    expect(stripHtml('')).toBe('');
  });

  it('preserves text without HTML', () => {
    expect(stripHtml('Hello World')).toBe('Hello World');
  });
});

describe('sanitizeDisplayName', () => {
  it('strips HTML tags', () => {
    expect(sanitizeDisplayName('<b>John</b>')).toBe('John');
  });

  it('removes control characters', () => {
    expect(sanitizeDisplayName("John\x00Doe")).toBe('JohnDoe');
  });

  it('trims whitespace', () => {
    expect(sanitizeDisplayName('  John  ')).toBe('John');
  });

  it('truncates to max length', () => {
    const long = 'ก'.repeat(200);
    expect(sanitizeDisplayName(long, 50).length).toBe(50);
  });
});

describe('sanitizeNote', () => {
  it('strips HTML', () => {
    expect(sanitizeNote('<p>test</p>')).toBe('test');
  });

  it('removes javascript: URLs', () => {
    expect(sanitizeNote('Click javascript:alert(1)')).not.toContain('javascript:');
  });

  it('removes event handlers', () => {
    expect(sanitizeNote('onclick=alert(1)')).not.toContain('onclick');
  });

  it('removes control characters', () => {
    expect(sanitizeNote("test\x00note")).toBe('testnote');
  });

  it('truncates to max length', () => {
    const long = 'ก'.repeat(1000);
    expect(sanitizeNote(long, 100).length).toBe(100);
  });
});

describe('sanitizeCsvCell', () => {
  it('prefixes cells starting with =', () => {
    expect(sanitizeCsvCell('=cmd|/C calc')).toBe("'=cmd|/C calc");
  });

  it('prefixes cells starting with +', () => {
    expect(sanitizeCsvCell('+1+2')).toBe("'+1+2");
  });

  it('prefixes cells starting with -', () => {
    expect(sanitizeCsvCell('-1+2')).toBe("'-1+2");
  });

  it('prefixes cells starting with @', () => {
    expect(sanitizeCsvCell('@SUM(1,1)')).toBe("'@SUM(1,1)");
  });

  it('escapes double quotes in normal cells', () => {
    expect(sanitizeCsvCell('hello"world')).toBe('hello""world');
  });

  it('leaves safe cells unchanged', () => {
    expect(sanitizeCsvCell('John Doe')).toBe('John Doe');
  });
});

describe('sanitizeFilePath', () => {
  it('removes path traversal', () => {
    expect(sanitizeFilePath('../../../etc/passwd')).not.toContain('..');
  });

  it('removes tilde', () => {
    expect(sanitizeFilePath('~/file.txt')).not.toContain('~');
  });

  it('removes angle brackets and pipes', () => {
    expect(sanitizeFilePath('file<>|txt')).not.toContain('<');
    expect(sanitizeFilePath('file<>|txt')).not.toContain('>');
    expect(sanitizeFilePath('file<>|txt')).not.toContain('|');
  });

  it('preserves valid file paths', () => {
    expect(sanitizeFilePath('evidence/photo.jpg')).toBe('evidence/photo.jpg');
  });
});

describe('sanitizeSearchQuery', () => {
  it('strips HTML tags', () => {
    expect(sanitizeSearchQuery('<b>test</b>')).toBe('test');
  });

  it('removes dangerous characters', () => {
    const result = sanitizeSearchQuery('test<>"\';&');
    expect(result).not.toContain('<');
    expect(result).not.toContain('>');
  });

  it('truncates to max length', () => {
    const long = 'a'.repeat(500);
    expect(sanitizeSearchQuery(long).length).toBe(200);
  });
});

describe('sanitizeNotification', () => {
  it('strips HTML', () => {
    expect(sanitizeNotification('<b>Alert</b>')).toBe('Alert');
  });

  it('removes javascript: URLs', () => {
    expect(sanitizeNotification('javascript:alert(1)')).not.toContain('javascript:');
  });

  it('truncates to max length', () => {
    const long = 'ก'.repeat(500);
    expect(sanitizeNotification(long, 50).length).toBe(50);
  });
});

describe('isValidStudentId', () => {
  it('accepts 10-digit number', () => {
    expect(isValidStudentId('1234567890')).toBe(true);
  });

  it('rejects less than 10 digits', () => {
    expect(isValidStudentId('12345')).toBe(false);
  });

  it('rejects non-digit characters', () => {
    expect(isValidStudentId('12345abcde')).toBe(false);
  });

  it('rejects empty string', () => {
    expect(isValidStudentId('')).toBe(false);
  });
});

describe('isValidPhone', () => {
  it('accepts phone without dashes', () => {
    expect(isValidPhone('0812345678')).toBe(true);
  });

  it('rejects phone with dashes', () => {
    expect(isValidPhone('081-234-5678')).toBe(false);
  });

  it('rejects invalid phone', () => {
    expect(isValidPhone('1234')).toBe(false);
  });

  it('rejects empty string', () => {
    expect(isValidPhone('')).toBe(false);
  });
});
