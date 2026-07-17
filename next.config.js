/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // "standalone" produces a self-contained bundle Electron launches as a child
  // process. A normal server (Render, `next start`) must NOT use standalone, so
  // it's opt-in via NEXT_OUTPUT_STANDALONE=true (set only for Electron builds).
  output:
    process.env.NEXT_OUTPUT_STANDALONE === "true" ? "standalone" : undefined,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.vinted.net" },
      { protocol: "https", hostname: "*.vinted.com" },
      { protocol: "https", hostname: "*.wallapop.com" },
    ],
  },
};

module.exports = nextConfig;
