import { createClient } from "redis";

export type RedisClient = ReturnType<typeof createClient>;

// Lazy connect — only opens a connection when first needed, so the server
// and unit tests can start without Redis running.
let clientPromise: Promise<RedisClient> | undefined;

export function getRedis(): Promise<RedisClient> {
  if (!clientPromise) {
    const client = createClient({ url: process.env.REDIS_URL });
    // Without an error listener, a dropped connection would crash the process
    client.on("error", (err) => console.error("Redis error:", err));
    clientPromise = client.connect().catch((err) => {
      clientPromise = undefined; // allow the next call to retry
      throw err;
    });
  }
  return clientPromise;
}
