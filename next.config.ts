import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    domains: [
      "ui-avatars.com",
      "res.cloudinary.com", // ✅ REQUIRED for your case
    ],
  },
};

export default nextConfig;