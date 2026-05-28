/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  images: {
    domains: ["res.cloudinary.com"],
  },
  experimental: {
    serverComponentsExternalPackages: ["mongoose", "bull", "ioredis"],
  },
};
module.exports = nextConfig;
