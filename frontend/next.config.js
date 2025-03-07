/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  reactStrictMode: true,
  experimental: {
    // Enable if you need to use Server Components
    // serverComponents: true,
  },
  // If you have an asset prefix, add it here
  // assetPrefix: '/my-prefix',
};

module.exports = nextConfig;
