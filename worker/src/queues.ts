import IORedis from "ioredis";
import { Queue } from "bullmq";
import { env } from "./env";

export const connection =
  process.env.BUILDING === "1" || process.env.npm_lifecycle_event === "build" || process.env.NEXT_PHASE === "phase-production-build"
    ? null
    : env.REDIS_URL
    ? new IORedis(env.REDIS_URL, { maxRetriesPerRequest: null })
    : null;

// Payments queue (stars topup webhooks + reconcile)
export const paymentsQueue = new Queue("payments", { connection: connection as any });

// Analytics queue (watch time / retention / realtime / A/B)
export const analyticsQueue = new Queue("analytics", { connection: connection as any });

// Notifications queue (in-app, digest)
export const notificationsQueue = new Queue("notifications", { connection: connection as any });

// Storage queue (R2/FTP/Drive redundancy)
export const storageQueue = new Queue("storage", { connection: connection as any });
