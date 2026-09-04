import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // NOTE: `output: "standalone"` would cut the deployed image down a lot, but
  // it changes the start command — `next start` refuses to serve a standalone
  // build, and the host has to run `node .next/standalone/server.js` instead.
  // Not worth silently breaking an existing deploy pipeline for; enable it
  // deliberately, together with the host's start command.

  // Don't advertise the framework version.
  poweredByHeader: false,

  compress: true,
  reactStrictMode: true,

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          // The dealer portal renders no third-party content and should never
          // be embedded — this is the clickjacking guard.
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
