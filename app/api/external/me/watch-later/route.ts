import { prisma } from "@/lib/prisma";
import { requireExternalUser } from "@/lib/externalAuth";

export const runtime = "nodejs";

export async function OPTIONS(req: Request) {
  const key = await requireExternalUser(req, ["me/watch-later"]);
  if (key instanceof Response) return key;
  return new Response(null, { status: 204, headers: key.cors });
}

export async function GET(req: Request) {
  const result = await requireExternalUser(req, ["me/watch-later"]);
  if (result instanceof Response) return result;

  const items = await prisma.watchLaterItem.findMany({
    where: { userId: result.user.id },
    orderBy: { createdAt: "desc" },
    take: 500,
    include: { video: true },
  });

  type WatchLaterRow = Awaited<ReturnType<typeof prisma.watchLaterItem.findMany>>[number] & {
    video?: { status: string; title: string; thumbKey: string | null; isSensitive: boolean; durationSec: number | null } | null;
  };
  const videoIds = (items as WatchLaterRow[]).map((i: WatchLaterRow) => i.videoId);
  const progress = await prisma.videoProgress.findMany({
    where: { userId: result.user.id, videoId: { in: videoIds } },
    select: { videoId: true, seconds: true, updatedAt: true },
  });
  type ProgressRow = Awaited<ReturnType<typeof prisma.videoProgress.findMany>>[number];
  const progressByVideo = new Map((progress as ProgressRow[]).map((p: ProgressRow) => [p.videoId, p]));

  return Response.json(
    {
      ok: true,
      items: (items as WatchLaterRow[])
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
    },
    { headers: result.cors },
  );
}
