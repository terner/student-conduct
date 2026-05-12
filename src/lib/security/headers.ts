/**
 * Security Headers Configuration
 * 
 * Based on OWASP Secure Headers Project:
 * https://owasp.org/www-project-secure-headers/
 * 
 * And Mozilla Web Security Guidelines:
 * https://infosec.mozilla.org/guidelines/web_security
 */

export interface SecurityHeadersConfig {
  csp: {
    defaultSrc: string[];
    scriptSrc: string[];
    styleSrc: string[];
    imgSrc: string[];
    fontSrc: string[];
    connectSrc: string[];
    frameAncestors: string[];
    formAction: string[];
    baseUri: string[];
    upgradeInsecureRequests?: boolean;
  };
  hsts?: {
    maxAge: number;
    includeSubDomains: boolean;
    preload?: boolean;
  };
}

export function buildCspHeader(config: SecurityHeadersConfig['csp']): string {
  const directives = [
    `default-src ${config.defaultSrc.join(' ')}`,
    `script-src ${config.scriptSrc.join(' ')}`,
    `style-src ${config.styleSrc.join(' ')}`,
    `img-src ${config.imgSrc.join(' ')}`,
    `font-src ${config.fontSrc.join(' ')}`,
    `connect-src ${config.connectSrc.join(' ')}`,
    `frame-ancestors ${config.frameAncestors.join(' ')}`,
    `form-action ${config.formAction.join(' ')}`,
    `base-uri ${config.baseUri.join(' ')}`,
  ];

  if (config.upgradeInsecureRequests) {
    directives.push('upgrade-insecure-requests');
  }

  return directives.join('; ');
}

/**
 * Default security configuration for school conduct system
 */
export const defaultSecurityConfig: SecurityHeadersConfig = {
  csp: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],  // Next.js needs these
    styleSrc: ["'self'", "'unsafe-inline'"],
    imgSrc: ["'self'", 'data:', 'blob:', 'https://*.supabase.co', 'https://*.blob.vercel-storage.com', 'https://lh3.googleusercontent.com', 'https://drive.google.com'],
    fontSrc: ["'self'", 'data:', 'https://fonts.gstatic.com'],
    connectSrc: ["'self'", 'https://*.supabase.co', 'wss://*.supabase.co', 'https://*.vercel.app', 'https://api.github.com', 'https://*.ingest.sentry.io'],
    frameAncestors: ["'none'"],
    formAction: ["'self'"],
    baseUri: ["'self'"],
    upgradeInsecureRequests: true,
  },
  hsts: {
    maxAge: 63072000,  // 2 years
    includeSubDomains: true,
    preload: true,
  },
};

export const securityHeaders = [
  // Prevent XSS
  { key: 'X-XSS-Protection', value: '1; mode=block' },
  
  // Prevent clickjacking
  { key: 'X-Frame-Options', value: 'DENY' },
  
  // Prevent MIME type sniffing
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  
  // Referrer policy
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  
  // Permissions policy (disable unnecessary features)
  { key: 'Permissions-Policy', value: [
    'camera=()',
    'microphone=()',
    'geolocation=()',
    'payment=()',
    'usb=()',
    'magnetometer=()',
    'accelerometer=()',
    'gyroscope=()',
  ].join(', ')},
  
  // Content Security Policy
  {
    key: 'Content-Security-Policy',
    value: buildCspHeader(defaultSecurityConfig.csp),
  },
  
  // HTTP Strict Transport Security
  {
    key: 'Strict-Transport-Security',
    value: `max-age=${defaultSecurityConfig.hsts!.maxAge}; includeSubDomains${defaultSecurityConfig.hsts!.preload ? '; preload' : ''}`,
  },
] as const;
