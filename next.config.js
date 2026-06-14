/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    instrumentationHook: true,
    serverComponentsExternalPackages: ["mongoose","cloudinary","node-cron"],
  },
  images: {
    domains: ["res.cloudinary.com"],
  },
};
module.exports = nextConfig;
