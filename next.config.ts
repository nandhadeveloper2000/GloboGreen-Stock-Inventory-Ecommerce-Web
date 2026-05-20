import type { NextConfig } from "next";

const apiOrigin =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";

const isDev = process.env.NODE_ENV !== "production";

// Content-Security-Policy — restricts where scripts, styles, images, and API calls can come from
const cspDirectives = [
  "default-src 'self'",
  // Scripts: allow self + inline (needed for Next.js hydration)
  isDev
    ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
    : "script-src 'self' 'unsafe-inline'",
  // Styles: allow self + inline + Google Fonts
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  // Fonts
  "font-src 'self' https://fonts.gstatic.com data:",
  // Images: self + data URIs + blob (camera/canvas) + Cloudinary + ui-avatars
  "img-src 'self' data: blob: https://res.cloudinary.com https://ui-avatars.com",
  // API calls: self + configured backend origin
  `connect-src 'self' ${apiOrigin} wss: ws:`,
  // Disallow <frame> / <iframe> embedding of this app anywhere
  "frame-src 'none'",
  "frame-ancestors 'none'",
  // Workers
  "worker-src 'self' blob:",
  // Manifest
  "manifest-src 'self'",
  // Block all plugins (Flash, Java applets, etc.)
  "object-src 'none'",
  // Prevent base-tag hijacking
  "base-uri 'self'",
  // All form submissions must go to same origin
  "form-action 'self'",
].join("; ");

const securityHeaders = [
  // Prevent clickjacking — this app must never be framed
  { key: "X-Frame-Options", value: "DENY" },
  // Prevent MIME-type sniffing attacks
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Only send origin in Referer header (no full URL path/query)
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Force HTTPS for 2 years (production only)
  ...(isDev
    ? []
    : [
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
      ]),
  // Disable browser features this app doesn't need
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
  // Restrict cross-origin resource sharing at the browser level
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
  // Content-Security-Policy
  { key: "Content-Security-Policy", value: cspDirectives },
];

const nextConfig: NextConfig = {
  outputFileTracingRoot: process.cwd(),

  // Apply security headers to all routes
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },

  images: {
    remotePatterns: [
      { protocol: "https", hostname: "ui-avatars.com" },
      { protocol: "https", hostname: "res.cloudinary.com" },
    ],
  },
};

export default nextConfig;
