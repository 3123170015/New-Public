import { Queue, type ConnectionOptions } from "bullmq";
import { getRedis } from "./redis";

const buildMode = process.env.BUILDING === "1" || process.env.NEXT_PHASE === "phase-production-build";
const connection = buildMode ? null : (getRedis() as ConnectionOptions | null);
const noopQueue = { add: async () => ({}) } as unknown as Queue;

const createQueue = (name: string) => (connection ? new Queue(name, { connection }) : noopQueue);

export const queues = {
  processVideo: createQueue("processVideo"),
  encodeHls: createQueue("encodeHls"),
  syncApiSource: createQueue("syncApiSource"),
  subtitles: createQueue("subtitles"),
  clamavScan: createQueue("clamavScan"),
  payments: createQueue("payments"),
  nft: createQueue("nft"),
  analytics: createQueue("analytics"),
  creatorWebhooks: createQueue("creatorWebhooks"),
  editor: createQueue("editor"),
  moderation: createQueue("moderation"),
  cdn: createQueue("cdn"),
};
