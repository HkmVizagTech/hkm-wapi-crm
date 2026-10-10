import mongoose from "mongoose";

let cached = global._mongoose || (global._mongoose = { conn:null, promise:null });

export async function connectDB() {
  if (cached.conn) return cached.conn;

  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI env var is not set");

  if (!cached.promise) {
    cached.promise = mongoose.connect(uri, {
      bufferCommands:    false,
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS:          45000,
      connectTimeoutMS:         10000,
      maxPoolSize:              20,
      // If every connection is busy, fail after 20s instead of queueing forever
      // (an endless queue is what froze sending when the DB slowed down).
      waitQueueTimeoutMS:       20000,
      ssl:                      true,
      tls:                      true,
    });
  }

  try {
    cached.conn = await cached.promise;
    return cached.conn;
  } catch(e) {
    cached.promise = null; // reset so next request retries
    throw e;
  }
}
