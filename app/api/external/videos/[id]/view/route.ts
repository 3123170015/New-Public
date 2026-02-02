import { requireExternalUser } from "@/lib/externalAuth";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { incDailyMetric } from "@/lib/metrics";
import { incBoostStat } from "@/lib/boost";

export const runtime = "nodejs";

export async function OPTIONS(req: Request) {
  const auth = await requireExternalUser(req, ["videos/view"]);
  if (auth instanceof Response) return auth;
  return new Response(null, { status: 204, headers: auth.cors });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireExternalUser(req, ["videos/view"]);
  if (auth instanceof Response) return auth;
  const { id } = await params;

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.video.update({ where: { id }, data: { viewCount: { increment: 1 } } });
    await incDailyMetric(tx as any, id, "views", 1);
    await incBoostStat(tx as any, id, "statViews", 1);
  });

  return Response.json({ ok: true }, { headers: auth.cors });
}
