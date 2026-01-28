import IORedis from "ioredis";
import { env } from "./env";

declare global {
  // eslint-disable-next-line no-var
  var _videoshare_worker_redis: IORedis | undefined;
}

export function getWorkerRedis() {
  return null;
}
