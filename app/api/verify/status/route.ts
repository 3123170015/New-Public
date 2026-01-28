import os from "os";
import { isConfiguredEnv } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = Math.max(0, totalMem - freeMem);
  const memPct = totalMem ? Math.round((usedMem / totalMem) * 1000) / 10 : 0;

  return Response.json({
    ok: true,
    ts: new Date().toISOString(),
    uptimeSec: Math.round(os.uptime()),
    load: os.loadavg(),
    cpus: os.cpus().length,
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
  });
}
