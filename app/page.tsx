import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import SensitiveThumb from "@/components/sensitive/SensitiveThumb";
import TrackedVideoLink from "@/components/analytics/TrackedVideoLink";
import { resolveMediaUrl } from "@/lib/mediaUrl";
import { getSensitiveModeForUser } from "@/lib/sensitive";
import CommunityPoll from "@/components/community/CommunityPoll";
import { getActiveMembershipTier } from "@/lib/membership";
import { getSiteConfig } from "@/lib/siteConfig";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  type BoostOrderRow = Awaited<ReturnType<typeof prisma.boostOrder.findMany>>[number] & { video?: { status?: string | null } | null };
  type CommunityPostRow = Awaited<ReturnType<typeof prisma.communityPost.findMany>>[number] & { author?: { name?: string | null } | null; pollOptions?: { id: string; text: string; _count: { votes: number } }[] };
  type ProgressRow = Awaited<ReturnType<typeof prisma.videoProgress.findMany>>[number] & { video?: { id?: string | null; status?: string | null } | null };
  type VideoRow = Awaited<ReturnType<typeof prisma.video.findMany>>[number];
  type CategoryRow = Awaited<ReturnType<typeof prisma.category.findMany>>[number];

  const session = await auth();
  const viewerId = (session?.user as any)?.id as string | undefined;
  const isAdmin = session?.user?.role === "ADMIN";
  const sensitiveMode = await getSensitiveModeForUser(viewerId ?? null);
  const cfg = await getSiteConfig();
  const sectionLimit = Math.max(3, Math.min(24, Number((cfg as any).homeSectionLimit ?? 12)));
  const sectionOrder = String((cfg as any).homeSectionOrder ?? "TRENDING,FEED,BOOSTED,CONTINUE_WATCHING,COMMUNITY,RECENT")
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);
  const categoryIds = String((cfg as any).homeCategoryIds ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const viewerMem = {
    membershipTier: ((session?.user as any)?.membershipTier ?? "NONE") as any,
    membershipExpiresAt: (session?.user as any)?.membershipExpiresAt ? new Date(((session?.user as any).membershipExpiresAt) as any) : null,
  };
  const activeTier = getActiveMembershipTier(viewerMem as any);
  const isPPlus = activeTier === "PREMIUM_PLUS";
  const hideBoostAds = isPPlus && Boolean((session?.user as any)?.premiumPlusHideBoostAds);

  const boostedOrders = hideBoostAds || !prisma
    ? []
    : await prisma.boostOrder.findMany({
        where: { status: "ACTIVE", endAt: { gt: new Date() } },
        include: { video: true },
        orderBy: { createdAt: "desc" },
        take: Math.max(18, sectionLimit),
      });

  const boosted = (boostedOrders as BoostOrderRow[])
    .map((b: BoostOrderRow) => b.video)
    .filter((v) => v && v.status === "PUBLISHED")
    .slice(0, sectionLimit);

  const [recentPosts, trendingVideos, recentVideos, categories] = prisma
    ? await Promise.all([
        prisma.communityPost.findMany({
          where: { isDeleted: false },
          orderBy: { createdAt: "desc" },
          take: Math.max(6, Math.min(12, sectionLimit)),
          include: {
            author: { select: { id: true, name: true } },
            pollOptions: { orderBy: { sort: "asc" }, include: { _count: { select: { votes: true } } } },
          },
        }),
        prisma.video.findMany({
          where: { status: "PUBLISHED", access: "PUBLIC" },
          orderBy: { viewCount: "desc" },
          take: sectionLimit,
        }),
        prisma.video.findMany({
          where: { status: "PUBLISHED", access: "PUBLIC" },
          orderBy: { createdAt: "desc" },
          take: sectionLimit,
        }),
        categoryIds.length
          ? prisma.category.findMany({
              where: { id: { in: categoryIds } },
              orderBy: { updatedAt: "desc" },
              take: 6,
            })
          : [],
      ])
    : [[], [], [], []];

  const voteMap = new Map<string, string>();
  if (viewerId && recentPosts.length && prisma) {
    const votes = await prisma.communityPollVote.findMany({
      where: { userId: viewerId, postId: { in: (recentPosts as CommunityPostRow[]).map((p: CommunityPostRow) => p.id) } },
      select: { postId: true, optionId: true },
    });
    for (const v of votes) voteMap.set(v.postId, v.optionId);
  }

  const recentProgress = viewerId && prisma
    ? await prisma.videoProgress.findMany({
        where: { userId: viewerId },
        orderBy: { updatedAt: "desc" },
        take: sectionLimit,
        include: { video: true },
      })
    : [];

  const sections = sectionOrder.length ? sectionOrder : ["TRENDING", "FEED", "BOOSTED", "CONTINUE_WATCHING", "COMMUNITY", "RECENT"];
  const itemGrid =
    "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";

  return (
    <main className="mx-auto max-w-6xl space-y-6">
      <section className="lux-panel">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-[0.3em] text-zinc-500">Collector Hub</div>
            <h1 className="lux-title">Luxury video gallery</h1>
            <p className="muted mt-1 text-sm">
              Curated drops, creator intel, and verified listings in one premium experience.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="lux-pill">Verified</span>
            <span className="lux-pill">1/1 Drops</span>
            <span className="lux-pill">Collector tier</span>
            <Link className="btn btn-primary" href="/feed">
              Open vertical feed
            </Link>
          </div>
        </div>
      </section>

      {sections.map((section) => {
        if (section === "CONTINUE_WATCHING" && !viewerId) {
          return null;
        }
        if (section === "CONTINUE_WATCHING" && viewerId) {
          return (
            <section key={section} className="lux-panel">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-lg font-semibold">Continue watching</div>
                  <div className="muted text-sm">Resume across devices in collector mode.</div>
                </div>
                <Link className="btn btn-ghost" href="/history">
                  Open history
                </Link>
              </div>
              {recentProgress.length === 0 ? (
                <div className="muted mt-4 text-sm">No watch history yet.</div>
              ) : (
                <div className={`${itemGrid} mt-4`}>
                  {recentProgress
                    .filter((p: ProgressRow) => p.video && (p.video as any).status === "PUBLISHED")
                    .map((p: ProgressRow) => (
                      <div key={p.id} className="card">
                        <TrackedVideoLink href={`/v/${(p.video as any).id}?t=${p.seconds}`} videoId={(p.video as any).id} source="HOME" placement="continue_watching">
                          <div className="text-sm font-semibold">{(p.video as any).title}</div>
                          <div className="muted text-xs">
                            {p.seconds}s • updated {new Date(p.updatedAt).toLocaleString()}
                          </div>
                          <div className="mt-3 overflow-hidden rounded-2xl bg-zinc-100 dark:bg-zinc-800" style={{ aspectRatio: "16/9" }}>
                            <SensitiveThumb
                              src={resolveMediaUrl((p.video as any).thumbKey)}
                              alt={(p.video as any).title}
                              isSensitive={Boolean((p.video as any).isSensitive)}
                              mode={sensitiveMode}
                            />
                          </div>
                        </TrackedVideoLink>
                      </div>
                    ))}
                </div>
              )}
            </section>
          );
        }

        if (section === "BOOSTED") {
          return (
            <section key={section} className="lux-panel">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-lg font-semibold">Boosted spotlight</div>
                  <div className="muted text-sm">Premium placements for top drops.</div>
                </div>
                <Link className="btn btn-ghost" href="/feed">
                  Open feed
                </Link>
              </div>
              {hideBoostAds ? (
                <div className="muted mt-4 text-sm">Boosted ads hidden (Premium+).</div>
              ) : boosted.length === 0 ? (
                <div className="muted mt-4 text-sm">No boosted videos yet.</div>
              ) : (
                <div className={`${itemGrid} mt-4`}>
                  {(boosted as VideoRow[]).map((v: VideoRow) => (
                    <div key={v.id} className="card border-amber-200/70 dark:border-amber-400/30">
                      <TrackedVideoLink href={`/v/${v.id}`} videoId={v.id} source="HOME" placement="home_boosted">
                        <div className="text-xs uppercase tracking-[0.2em] text-amber-500">Boosted</div>
                        <div className="mt-1 text-sm font-semibold">{v.title}</div>
                        <div className="mt-3 overflow-hidden rounded-2xl bg-zinc-100 dark:bg-zinc-800" style={{ aspectRatio: "16/9" }}>
                          <SensitiveThumb
                            src={resolveMediaUrl(v.thumbKey)}
                            alt={v.title ?? ""}
                            isSensitive={Boolean((v as any).isSensitive)}
                            mode={sensitiveMode}
                          />
                        </div>
                      </TrackedVideoLink>
                    </div>
                  ))}
                </div>
              )}
            </section>
          );
        }

        if (section === "FEED") {
          return (
            <section key={section} className="lux-panel">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-lg font-semibold">Creator feed</div>
                  <div className="muted text-sm">Swipe the TikTok-style vertical feed.</div>
                </div>
                <Link className="btn btn-primary" href="/feed">
                  Open feed
                </Link>
              </div>
              <div className="mt-4 grid gap-4 lg:grid-cols-[1.2fr_1fr]">
                <div className="card">
                  <div className="text-sm font-semibold">Collector highlights</div>
                  <div className="muted text-xs">Premium clips and vertical reels.</div>
                  <div className="mt-3 overflow-hidden rounded-2xl bg-zinc-100 dark:bg-zinc-800" style={{ aspectRatio: "16/9" }}>
                    <div className="flex h-full items-center justify-center text-xs uppercase tracking-[0.3em] text-zinc-400">
                      Feed preview
                    </div>
                  </div>
                </div>
                <div className="card">
                  <div className="text-sm font-semibold">Why collectors love it</div>
                  <ul className="mt-3 space-y-2 text-sm text-zinc-600 dark:text-zinc-300">
                    <li>• Full-screen vertical playback</li>
                    <li>• Swipe-to-next discovery</li>
                    <li>• Integrated NFT drops</li>
                  </ul>
                </div>
              </div>
            </section>
          );
        }
        if (section === "TRENDING") {
          return (
            <section key={section} className="lux-panel">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-lg font-semibold">Trending now</div>
                  <div className="muted text-sm">Most-viewed collector drops.</div>
                </div>
                <Link className="btn btn-ghost" href="/trending">
                  View all
                </Link>
              </div>
              {trendingVideos.length === 0 ? (
                <div className="muted mt-4 text-sm">No trending videos yet.</div>
              ) : (
                <div className={`${itemGrid} mt-4`}>
                  {(trendingVideos as VideoRow[]).map((v: VideoRow) => (
                    <div key={v.id} className="card">
                      <TrackedVideoLink href={`/v/${v.id}`} videoId={v.id} source="HOME" placement="home_trending">
                        <div className="text-sm font-semibold">{v.title}</div>
                        <div className="muted text-xs">{v.viewCount} views</div>
                        <div className="mt-3 overflow-hidden rounded-2xl bg-zinc-100 dark:bg-zinc-800" style={{ aspectRatio: "16/9" }}>
                          <SensitiveThumb
                            src={resolveMediaUrl(v.thumbKey)}
                            alt={v.title}
                            isSensitive={Boolean((v as any).isSensitive)}
                            mode={sensitiveMode}
                          />
                        </div>
                      </TrackedVideoLink>
                    </div>
                  ))}
                </div>
              )}
            </section>
          );
        }

        if (section === "RECENT") {
          return (
            <section key={section} className="lux-panel">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-lg font-semibold">Recent drops</div>
                  <div className="muted text-sm">Latest releases from verified creators.</div>
                </div>
                <Link className="btn btn-ghost" href="/explore">
                  Explore
                </Link>
              </div>
              {recentVideos.length === 0 ? (
                <div className="muted mt-4 text-sm">No recent videos yet.</div>
              ) : (
                <div className={`${itemGrid} mt-4`}>
                  {(recentVideos as VideoRow[]).map((v: VideoRow) => (
                    <div key={v.id} className="card">
                      <TrackedVideoLink href={`/v/${v.id}`} videoId={v.id} source="HOME" placement="home_recent">
                        <div className="text-sm font-semibold">{v.title}</div>
                        <div className="muted text-xs">{new Date(v.createdAt).toLocaleDateString()}</div>
                        <div className="mt-3 overflow-hidden rounded-2xl bg-zinc-100 dark:bg-zinc-800" style={{ aspectRatio: "16/9" }}>
                          <SensitiveThumb
                            src={resolveMediaUrl(v.thumbKey)}
                            alt={v.title}
                            isSensitive={Boolean((v as any).isSensitive)}
                            mode={sensitiveMode}
                          />
                        </div>
                      </TrackedVideoLink>
                    </div>
                  ))}
                </div>
              )}
            </section>
          );
        }

        if (section === "COMMUNITY") {
          return (
            <section key={section} className="lux-panel">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-lg font-semibold">Community intel</div>
                  <div className="muted text-sm">Latest collector discussions.</div>
                </div>
                <Link className="btn btn-ghost" href="/subscriptions">
                  Open subscriptions
                </Link>
              </div>
              {recentPosts.length === 0 ? (
                <div className="muted mt-4 text-sm">No community posts yet.</div>
              ) : (
                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  {(recentPosts as CommunityPostRow[]).map((p: CommunityPostRow) => (
                    <div key={p.id} className="card">
                      <div className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                        {p.author?.name ?? "Unknown"} • {new Date(p.createdAt).toLocaleString()}
                      </div>
                      {p.text ? <div className="mt-2 text-sm whitespace-pre-wrap">{p.text}</div> : null}
                      {p.youtubeUrl ? (
                        <a className="mt-2 inline-block text-sm underline" href={p.youtubeUrl} target="_blank" rel="noreferrer">
                          YouTube
                        </a>
                      ) : null}
                      {p.linkUrl ? (
                        <a className="mt-2 inline-block text-sm underline" href={p.linkUrl} target="_blank" rel="noreferrer">
                          Open link
                        </a>
                      ) : null}
                      {p.mediaUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.mediaUrl} alt="" className="mt-3 w-full rounded-xl" />
                      ) : null}
                      {p.pollOptions && p.pollOptions.length ? (
                        <div className="mt-3">
                          <CommunityPoll
                            postId={p.id}
                            options={(p.pollOptions ?? []).map((o: { id: string; text: string; _count: { votes: number } }) => ({ id: o.id, text: o.text, votes: o._count.votes }))}
                            viewerVotedOptionId={voteMap.get(p.id) ?? null}
                          />
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </section>
          );
        }

        if (section === "CATEGORIES") {
          return (
            <section key={section} className="lux-panel">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-lg font-semibold">Curated categories</div>
                  <div className="muted text-sm">Showcase hand-picked verticals.</div>
                </div>
                <Link className="btn btn-ghost" href="/explore">
                  Explore categories
                </Link>
              </div>
              {categories.length === 0 ? (
                <div className="muted mt-4 text-sm">No categories configured.</div>
              ) : (
                <div className="mt-4 flex flex-wrap gap-3">
                  {(categories as CategoryRow[]).map((cat: CategoryRow) => (
                    <Link key={cat.id} href={`/category/${cat.slug}`} className="lux-pill">
                      {cat.name}
                    </Link>
                  ))}
                </div>
              )}
            </section>
          );
        }

        return null;
      })}

      {isAdmin ? (
        <div className="card text-xs text-zinc-500">Admin session active.</div>
      ) : null}
    </main>
  );
}
