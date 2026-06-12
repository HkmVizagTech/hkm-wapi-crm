/**
 * Next.js Instrumentation
 * Runs once when the server starts.
 * Used to initialize the campaign scheduler.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Only run on Node.js runtime (not Edge)
    const { connectDB }     = await import("./lib/mongodb.js");
    const { initScheduler } = await import("./lib/scheduler.js");

    try {
      await connectDB();
      await initScheduler();
      console.log("✅ Scheduler initialized on server start");
    } catch(e) {
      console.error("Failed to initialize scheduler:", e.message);
    }
  }
}
