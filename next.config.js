/** @type {import('next').NextConfig} */
const nextConfig = {
  images: { domains: ["res.cloudinary.com"] },
  experimental: {
    serverComponentsExternalPackages: ["mongoose","bull","ioredis","cloudinary"],
  },
};
module.exports = nextConfig;
