/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable instrumentation hook for scheduler
  experimental: {
    instrumentationHook: true,
    serverComponentsExternalPackages: ["mongoose","cloudinary","node-cron"],
  },
  images: {
    domains: ["res.cloudinary.com"],
  },
};
module.exports = nextConfig;
