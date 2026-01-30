import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user) return Response.json({ ok: false, error: "UNAUTHENTICATED" }, { status: 401 });
  const userId = (session.user as any).id as string;

  type WatchLaterRow = Awaited<ReturnType<typeof prisma.watchLaterItem.findMany>>[number] & {
    video?: { status: string; title: string; thumbKey: string | null; isSensitive: boolean; durationSec: number | null } | null;
  };
  const items = await prisma.watchLaterItem.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 500,
    include: { video: true },
  });

  const videoIds = (items as WatchLaterRow[]).map((i: WatchLaterRow) => i.videoId);
  type ProgressRow = Awaited<ReturnType<typeof prisma.videoProgress.findMany>>[number];
  const progress = await prisma.videoProgress.findMany({
    where: { userId, videoId: { in: videoIds } },
    select: { videoId: true, seconds: true, updatedAt: true },
  });
  const progressByVideo = new Map((progress as ProgressRow[]).map((p: ProgressRow) => [p.videoId, p]));

  return Response.json({
    ok: true,
    items: items
      .filter((i: WatchLaterRow) => (i.video as any)?.status === "PUBLISHED")
      .map((i: WatchLaterRow) => {
        const v: any = i.video;
        const p = progressByVideo.get(i.videoId);
        return {
          id: i.id,
          videoId: i.videoId,
          createdAt: i.createdAt,
          title: v?.title ?? "(deleted)",
          thumbKey: v?.thumbKey ?? null,
          isSensitive: Boolean(v?.isSensitive),
          durationSec: v?.durationSec ?? null,
          progressSeconds: p?.seconds ?? 0,
          progressUpdatedAt: p?.updatedAt ?? null,
        };
      }),
  });
}
