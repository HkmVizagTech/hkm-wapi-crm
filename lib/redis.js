import Redis from "ioredis";

const REDIS_URL = process.env.REDIS_URL;
if (!REDIS_URL) throw new Error("Please define REDIS_URL in .env");

let redis;
if (!global.redis) {
  global.redis = new Redis(REDIS_URL);
}
redis = global.redis;

export default redis;
