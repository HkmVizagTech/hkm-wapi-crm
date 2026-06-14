/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    instrumentationHook: true,
    serverComponentsExternalPackages: ["mongoose","cloudinary","node-cron"],
  },
  images: {
    domains: ["res.cloudinary.com"],
  },
  // Increase server body size limit for large bulk sends
  serverRuntimeConfig: {
    maxPayloadSize: "50mb",
  },
};
module.exports = nextConfig;
