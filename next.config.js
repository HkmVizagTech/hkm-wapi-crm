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
// Railway env vars needed:
// GUPSHUP_APIKEY=sk_0381bd5a455746478c53899f213f838b
// GUPSHUP_APPNAME=4KoeJVChI420QyWVhAW1kE7L
// GUPSHUP_SOURCE=917075176108
// META_TOKEN=EAAOszfzKH7w...
// WABA_ID=218163978057442

module.exports = nextConfig;
