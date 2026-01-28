import IORedis from "ioredis";
import { Queue } from "bullmq";
import { env } from "./env";

export const connection = null;

// Payments queue (stars topup webhooks + reconcile)
export const paymentsQueue = new Queue("payments", { connection: connection as any });

// Analytics queue (watch time / retention / realtime / A/B)
export const analyticsQueue = new Queue("analytics", { connection: connection as any });

// Notifications queue (in-app, digest)
export const notificationsQueue = new Queue("notifications", { connection: connection as any });

// Storage queue (R2/FTP/Drive redundancy)
export const storageQueue = new Queue("storage", { connection: connection as any });
