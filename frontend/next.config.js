/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: process.env.NEXT_DIST_DIR || '.next',
  output: process.env.NEXT_OUTPUT_MODE,
  productionBrowserSourceMaps: false,
  // pdf-parse's pdfjs-dist dependency isn't webpack-bundleable in the RSC
  // build (throws at import time) — require it natively at runtime instead.
  experimental: {
    serverComponentsExternalPackages: ['pdf-parse', 'pdfjs-dist'],
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'nichiha.com' },
      { protocol: 'https', hostname: '**.nichiha.com' },
      { protocol: 'https', hostname: '**.squarespace-cdn.com' },
      { protocol: 'https', hostname: 'adsttc.com' },
      { protocol: 'https', hostname: '**.adsttc.com' },
      { protocol: 'https', hostname: 'drbhomes.com' },
      { protocol: 'https', hostname: '**.drbhomes.com' },
    ],
  },
};
module.exports = nextConfig;
