import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { resolveMediaUrl } from "@/lib/mediaUrl";
import { auth } from "@/lib/auth";
import { getSensitiveModeForUser, shouldHideSensitiveInListings } from "@/lib/sensitive";
import { getActiveMembershipTier } from "@/lib/membership";
import SensitiveThumb from "@/components/sensitive/SensitiveThumb";
import TrackedVideoLink from "@/components/analytics/TrackedVideoLink";

export const dynamic = "force-dynamic";

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

export default async function TrendingPage({ searchParams }: { searchParams: { days?: string } }) {
  type TrendRow = Awaited<ReturnType<typeof prisma.videoMetricDaily.groupBy>>[number];
  type TrendVideoRow = Awaited<ReturnType<typeof prisma.video.findMany>>[number];
  const session = await auth();
  const viewerId = (session?.user as any)?.id as string | undefined;
  const sensitiveMode = await getSensitiveModeForUser(viewerId ?? null);

  const activeTier = getActiveMembershipTier({
    membershipTier: ((session?.user as any)?.membershipTier ?? "NONE") as any,
    membershipExpiresAt: (session?.user as any)?.membershipExpiresAt ? new Date(((session?.user as any).membershipExpiresAt) as any) : null,
  });
  const allowAccess: any = activeTier === "PREMIUM_PLUS" ? { in: ["PUBLIC", "PREMIUM_PLUS"] } : "PUBLIC";

  const days = clamp(Number(searchParams.days ?? "7"), 1, 30);
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const rows = await prisma.videoMetricDaily.groupBy({
    by: ["videoId"],
    where: { day: { gte: since } },
    _sum: { views: true, likes: true, shares: true, comments: true, stars: true, gifts: true },
    orderBy: { _sum: { views: "desc" } },
    take: 200,
  });

  const scored = (rows as TrendRow[]).map((r: TrendRow) => {
    const sums = (r as any)._sum || {};
    const v = sums.views ?? 0;
    const l = sums.likes ?? 0;
    const s = sums.shares ?? 0;
    const c = sums.comments ?? 0;
    const st = sums.stars ?? 0;
    const g = sums.gifts ?? 0;
    const score = v * 1 + l * 18 + s * 28 + c * 20 + st * 2 + g * 12;
    return { videoId: r.videoId, score, sums: { views: v, likes: l, shares: s, comments: c, stars: st, gifts: g } };
  });

  scored.sort((a, b) => b.score - a.score);
  const topIds = scored.slice(0, 60).map((x: { videoId: string }) => x.videoId);

  const videos = await prisma.video.findMany({
    where: {
      id: { in: topIds },
      status: "PUBLISHED",
      access: allowAccess,
      ...(shouldHideSensitiveInListings(sensitiveMode) ? { isSensitive: false } : {}),
    },
    select: { id: true, title: true, thumbKey: true, createdAt: true, isSensitive: true },
  });
  const map = new Map((videos as TrendVideoRow[]).map((v: TrendVideoRow) => [v.id, v]));

  const out = scored
    .slice(0, 60)
    .map((x: { videoId: string }) => ({ ...x, video: map.get(x.videoId) }))
    .filter((x: { video?: unknown }) => Boolean(x.video)) as any[];

  return (
    <main>
      <h1>Trending</h1>
      <p className="muted small">Top video thịnh hành theo {days} ngày (score weighted theo views/likes/shares/comments/stars/gifts).</p>

      <div className="row" style={{ gap: 10, marginTop: 10 }}>
        <a className="small" href="/trending?days=1">1 day</a>
        <a className="small" href="/trending?days=7">7 days</a>
        <a className="small" href="/trending?days=30">30 days</a>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12, marginTop: 12 }}>
        {out.map((x: { videoId: string; score: number; sums: { views: number; likes: number; comments: number; shares: number; stars: number; gifts: number }; video: any }, idx) => (
          <div key={x.videoId} className="card">
            <TrackedVideoLink href={`/v/${x.videoId}`} videoId={x.videoId} source="TRENDING" placement="trending_grid">
              <div className="small muted">#{idx + 1} • score {x.score}</div>
              <div style={{ marginTop: 6, fontWeight: 800 }}>{x.video.title}</div>
              <div className="small muted" style={{ marginTop: 6 }}>
                {x.sums.views} views • {x.sums.likes} likes • {x.sums.comments} cmt • {x.sums.shares} shares • ⭐ {x.sums.stars} • 🎁 {x.sums.gifts}
              </div>

              <div style={{ marginTop: 10, aspectRatio: "16/9", borderRadius: 14, overflow: "hidden", background: "#f3f3f3" }}>
                <SensitiveThumb
                  src={resolveMediaUrl(x.video.thumbKey)}
                  alt={x.video.title ?? ""}
                  isSensitive={Boolean((x.video as any).isSensitive)}
                  mode={sensitiveMode}
                />
              </div>
            </TrackedVideoLink>
          </div>
        ))}
      </div>
    </main>
  );
}
