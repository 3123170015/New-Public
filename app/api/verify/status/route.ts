import os from "os";
import fs from "fs";
import { isConfiguredEnv } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PCT_SCALE = 1000;
const PCT_DIVISOR = 10;
let cachedDisk: { total: number; free: number; used: number; usagePct: number } | null = null;
let cachedDiskAt = 0;

export async function GET() {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = Math.max(0, totalMem - freeMem);
  const memPct = totalMem ? Math.round((usedMem / totalMem) * PCT_SCALE) / PCT_DIVISOR : 0;
  const cpus = os.cpus();
  const idle = cpus.reduce((sum, c) => sum + c.times.idle, 0);
  const total = cpus.reduce((sum, c) => sum + Object.values(c.times).reduce((s, v) => s + v, 0), 0);
  const cpuPct = total ? Math.round(((total - idle) / total) * PCT_SCALE) / PCT_DIVISOR : 0;
  let disk = cachedDisk ?? { total: 0, free: 0, used: 0, usagePct: 0 };
  const now = Date.now();
  if (!cachedDisk || now - cachedDiskAt > 15_000) {
    try {
      const stat = fs.statfsSync("/");
      const totalDisk = stat.bsize * stat.blocks;
      const freeDisk = stat.bsize * stat.bavail;
      const usedDisk = Math.max(0, totalDisk - freeDisk);
      const diskPct = totalDisk ? Math.round((usedDisk / totalDisk) * PCT_SCALE) / PCT_DIVISOR : 0;
      disk = { total: totalDisk, free: freeDisk, used: usedDisk, usagePct: diskPct };
      cachedDisk = disk;
      cachedDiskAt = now;
    } catch {
      // ignore
    }
  }

  return Response.json({
    ok: true,
    ts: new Date().toISOString(),
    uptimeSec: Math.round(os.uptime()),
    load: os.loadavg(),
    cpus: cpus.length,
    cpuUsagePct: cpuPct,
    platform: os.platform(),
    release: os.release(),
    node: process.version,
    configured: isConfiguredEnv(),
    memory: {
      total: totalMem,
      free: freeMem,
      used: usedMem,
      usagePct: memPct,
    },
    disk,
  });
}
