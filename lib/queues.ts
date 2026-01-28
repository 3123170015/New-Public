import { Queue, type ConnectionOptions } from "bullmq";
import { getRedis } from "./redis";

const connection = (process.env.npm_lifecycle_event === "build" || process.env.NEXT_PHASE === "phase-production-build")
  ? null
  : (getRedis() as ConnectionOptions | null);

export const queues = {
  processVideo: new Queue("processVideo", { connection: connection as any }),
  encodeHls: new Queue("encodeHls", { connection: connection as any }),
  syncApiSource: new Queue("syncApiSource", { connection: connection as any }),
  subtitles: new Queue("subtitles", { connection: connection as any }),
  clamavScan: new Queue("clamavScan", { connection: connection as any }),
  payments: new Queue("payments", { connection: connection as any }),
  nft: new Queue("nft", { connection: connection as any }),
  analytics: new Queue("analytics", { connection: connection as any }),
  creatorWebhooks: new Queue("creatorWebhooks", { connection: connection as any }),
  editor: new Queue("editor", { connection: connection as any }),
  moderation: new Queue("moderation", { connection: connection as any }),
  cdn: new Queue("cdn", { connection: connection as any }),
};
