import { prisma } from "@/lib/prisma";
import { requireApiKey } from "@/lib/externalAuth";

export const runtime = "nodejs";

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

export async function OPTIONS(req: Request) {
  const key = await requireApiKey(req, ["public/trending"]);
  if (key instanceof Response) return key;
  return new Response(null, { status: 204, headers: key.cors });
}

export async function GET(req: Request) {
  const key = await requireApiKey(req, ["public/trending"]);
  if (key instanceof Response) return key;

  const { searchParams } = new URL(req.url);
  const days = clamp(Number(searchParams.get("days") ?? "7"), 1, 30);
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  type MetricRow = Awaited<ReturnType<typeof prisma.videoMetricDaily.groupBy>>[number];
  const rows = await prisma.videoMetricDaily.groupBy({
    by: ["videoId"],
    where: { day: { gte: since } },
    _sum: { views: true, likes: true, shares: true, comments: true, stars: true, gifts: true },
    orderBy: { _sum: { views: "desc" } },
    take: 200,
  });

  const scored = (rows as MetricRow[]).map((r: MetricRow) => {
    const sum = r._sum ?? {};
    const v = sum.views ?? 0;
    const l = sum.likes ?? 0;
    const s = sum.shares ?? 0;
    const c = sum.comments ?? 0;
    const st = sum.stars ?? 0;
    const g = sum.gifts ?? 0;
    const score = v * 1 + l * 18 + s * 28 + c * 20 + st * 2 + g * 12;
    return { videoId: r.videoId, score, sums: { views: v, likes: l, shares: s, comments: c, stars: st, gifts: g } };
  });

  scored.sort((a, b) => b.score - a.score);
  const topIds = scored.slice(0, 60).map((x: { videoId: string }) => x.videoId);

  const videos = await prisma.video.findMany({
    where: { id: { in: topIds }, status: "PUBLISHED", access: "PUBLIC", deletedAt: null },
    select: { id: true, title: true, thumbKey: true, createdAt: true, viewCount: true, likeCount: true, commentCount: true, shareCount: true, starCount: true, giftCount: true },
  });
  const map = new Map(videos.map((v) => [v.id, v]));

  const out = scored
    .slice(0, 60)
    .map((x) => ({ ...x, video: map.get(x.videoId) }))
    .filter((x) => Boolean(x.video));

  return Response.json({ ok: true, days, items: out }, { headers: key.cors });
}
