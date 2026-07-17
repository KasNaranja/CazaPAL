/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Produce a self-contained server bundle (.next/standalone) that Electron
  // can launch as a child process when packaged into the .exe.
  output: "standalone",
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.vinted.net" },
      { protocol: "https", hostname: "*.vinted.com" },
      { protocol: "https", hostname: "images1.vinted.net" },
    ],
  },
};

module.exports = nextConfig;
