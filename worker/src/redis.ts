import IORedis from "ioredis";
import { env } from "./env";

declare global {
  // eslint-disable-next-line no-var
  var _videoshare_worker_redis: IORedis | undefined;
}

export function getWorkerRedis() {
  if (process.env.BUILDING === "1" || process.env.npm_lifecycle_event === "build" || process.env.NEXT_PHASE === "phase-production-build") return null;
  if (!env.REDIS_URL) return null;
  if (!globalThis._videoshare_worker_redis) {
    globalThis._videoshare_worker_redis = new IORedis(env.REDIS_URL, {
      maxRetriesPerRequest: null,
      enableReadyCheck: true,
    });
  }
  return globalThis._videoshare_worker_redis;
}
