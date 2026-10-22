import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  // Fonts for text drawn into wallet card images (read from disk at runtime).
  outputFileTracingIncludes: { "/api/**": ["./lib/wallet/fonts/**"] },
  partialPrefetching: true,
  // The old click-through demo is gone; the real thing is a card on your phone.
  async redirects() {
    return [{ source: "/demo", destination: "/#try-it", permanent: true }];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
