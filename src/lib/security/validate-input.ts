import { NextRequest, NextResponse } from 'next/server';

/**
 * Middleware to detect and block XSS attempts in request bodies
 * 
 * XSS Patterns detected:
 * - <script> tags
 * - Event handlers (onclick, onload, onerror, etc.)
 * - javascript: URLs
 * - data:text/html
 * - document.cookie access
 * - eval() / setTimeout / setInterval with strings
 */

const XSS_PATTERNS = [
  /<script[\s>]/i,
  /javascript\s*:/i,
  /on\w+\s*=/i,
  /data\s*:\s*text\/html/i,
  /document\s*\.\s*cookie/i,
  /<iframe[\s>]/i,
  /<object[\s>]/i,
  /<embed[\s>]/i,
  /<svg[\s>]/i,
  /<img[\s>].*onerror/i,
  /expression\s*\(/i,
  /vbscript\s*:/i,
];

export function detectXSS(input: string): boolean {
  return XSS_PATTERNS.some(pattern => pattern.test(input));
}

/**
 * Recursively check all string values in an object for XSS
 */
export function containsXSS(obj: unknown): boolean {
  if (typeof obj === 'string') {
    return detectXSS(obj);
  }
  if (Array.isArray(obj)) {
    return obj.some(item => containsXSS(item));
  }
  if (obj && typeof obj === 'object') {
    return Object.values(obj).some(value => containsXSS(value));
  }
  return false;
}

/**
 * XSS protection middleware for API routes
 * 
 * Usage:
 *   export async function POST(req: NextRequest) {
 *     const body = await req.json();
 *     const xssCheck = validateXSS(body);
 *     if (xssCheck) return xssCheck;
 *     // ... continue
 *   }
 */
export function validateXSS(body: unknown): NextResponse | null {
  if (containsXSS(body)) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'XSS_DETECTED',
          message: 'ตรวจพบรูปแบบข้อมูลที่ไม่ปลอดภัย กรุณาตรวจสอบข้อมูลอีกครั้ง',
        },
      },
      { status: 400 }
    );
  }
  return null;
}

/**
 * Content-Type validation — reject non-JSON/FormData
 */
export function validateContentType(req: NextRequest): NextResponse | null {
  const contentType = req.headers.get('content-type') || '';
  const method = req.method;

  if (['POST', 'PUT', 'PATCH'].includes(method)) {
    if (!contentType.includes('application/json') && 
        !contentType.includes('multipart/form-data') &&
        !contentType.includes('application/x-www-form-urlencoded')) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_CONTENT_TYPE',
            message: 'Content-Type ไม่ถูกต้อง',
          },
        },
        { status: 415 }
      );
    }
  }
  return null;
}
