/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    instrumentationHook: true,
    serverComponentsExternalPackages: ["mongoose","cloudinary","node-cron"],
    // Increase body size limit for large bulk uploads (default is 1mb)
    serverActions: {
      bodySizeLimit: "50mb",
    },
  },
  images: {
    domains: ["res.cloudinary.com"],
  },
};
module.exports = nextConfig;
