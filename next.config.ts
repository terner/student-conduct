import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { securityHeaders } from "@/lib/security/headers";

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  // Security headers for all routes
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          ...securityHeaders,
          // Additional protection for API routes
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
        ],
      },
    ];
  },

  // Prevent server-side information disclosure
  poweredByHeader: false,

  // React strict mode for development safety
  reactStrictMode: true,
};

export default withNextIntl(nextConfig);
