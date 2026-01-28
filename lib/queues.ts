import { Queue, type ConnectionOptions } from "bullmq";
import { getRedis } from "./redis";

const connection = getRedis() as ConnectionOptions;

export const queues = {
  processVideo: new Queue("processVideo", { connection }),
  encodeHls: new Queue("encodeHls", { connection }),
  syncApiSource: new Queue("syncApiSource", { connection }),
  subtitles: new Queue("subtitles", { connection }),
  clamavScan: new Queue("clamavScan", { connection }),
  payments: new Queue("payments", { connection }),
  nft: new Queue("nft", { connection }),
  analytics: new Queue("analytics", { connection }),
  creatorWebhooks: new Queue("creatorWebhooks", { connection }),
  editor: new Queue("editor", { connection }),
  moderation: new Queue("moderation", { connection }),
  cdn: new Queue("cdn", { connection }),
};
