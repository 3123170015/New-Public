import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { canInteractWithVideoDb, canViewVideoDb } from "@/lib/videoAccessDb";
import { incDailyMetric } from "@/lib/metrics";
import { incBoostStat } from "@/lib/boost";

export async function POST(req: Request) {
  const session = await auth();
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const videoId = body.videoId as string;
  if (!videoId) {
    return Response.json({ error: "Missing videoId" }, { status: 400 });
  }

  const video = await prisma.video.findUnique({
    where: { id: videoId },
    select: { id: true, status: true, access: true, interactionsLocked: true, authorId: true, deletedAt: true },
  });
  if (!video) {
    return Response.json({ error: "Video not found" }, { status: 404 });
  }
  if (!(await canViewVideoDb(video as any, session))) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!(await canInteractWithVideoDb(video as any, session))) {
    return Response.json({ error: "Interactions disabled" }, { status: 403 });
  }

  const updated = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await tx.video.update({ where: { id: videoId }, data: { shareCount: { increment: 1 } } });
    await incDailyMetric(tx as any, videoId, "shares", 1);
    await incBoostStat(tx as any, videoId, "statShares", 1);
    return tx.video.findUnique({ where: { id: videoId }, select: { shareCount: true } });
  });
  return Response.json({ shareCount: updated?.shareCount ?? 0 });
}
