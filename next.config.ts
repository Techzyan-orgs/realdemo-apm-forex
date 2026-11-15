import path from "node:path";
import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://lh3.googleusercontent.com https://flagcdn.com",
  "font-src 'self' data:",
  "connect-src 'self'" + (isDev ? " ws: wss:" : ""),
  "frame-src 'self' https://www.google.com https://maps.google.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const nextConfig: NextConfig = {
  // Cache Components is off: this app is mostly per-request data (rates, orders, KYC).
  cacheComponents: false,
  // separate build dirs let several dev servers run side by side (e2e / parallel work)
  distDir: process.env.NEXT_DIST_DIR ?? ".next",
  serverExternalPackages: ["sharp", "@prisma/client"],
  turbopack: {
    // pin the root: git worktrees nested under the repo would otherwise make Turbopack pick the
    // outer lockfile and watch sibling checkouts (their builds trigger endless reloads here)
    root: path.resolve(__dirname),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  images: {
    remotePatterns: [{ protocol: "https", hostname: "lh3.googleusercontent.com" }],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Content-Type-Options", value: "nosniff" },
        ],
      },
      {
        source: "/(admin|order|checkout)/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
      {
        // admin KYC review embeds PDF documents in a same-origin <iframe> preview
        source: "/api/admin/orders/:id/documents/:docId",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },
        ],
      },
    ];
  },
};

export default nextConfig;
