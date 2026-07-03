import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";
import { securityHeaders } from "@/lib/security/headers";

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          ...securityHeaders,
          { key: "X-Content-Type-Options", value: "nosniff" },
        ],
      },
    ];
  },
  poweredByHeader: false,
  reactStrictMode: true,
};

export default withNextIntl(nextConfig);
