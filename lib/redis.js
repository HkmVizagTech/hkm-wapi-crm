import Redis from "ioredis";

let redis = null;

export function getRedis() {
  if (redis) return redis;
  const REDIS_URL = process.env.REDIS_URL;
  if (!REDIS_URL) throw new Error("Please define REDIS_URL in Railway environment variables.");
  if (!global.redis) {
    global.redis = new Redis(REDIS_URL, { maxRetriesPerRequest: null });
  }
  redis = global.redis;
  return redis;
}

export default { getRedis };
