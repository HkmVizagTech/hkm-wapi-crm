import Bull from "bull";

let bulkSendQueue = null;

export function getQueue() {
  if (bulkSendQueue) return bulkSendQueue;
  const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
  bulkSendQueue = new Bull("bulk-send", REDIS_URL, {
    defaultJobOptions: {
      attempts: 3,
      backoff:  { type: "exponential", delay: 5000 },
      removeOnComplete: 100,
      removeOnFail:     200,
    },
  });
  return bulkSendQueue;
}

export default { getQueue };
