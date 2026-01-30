import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import SmartImage from "@/components/media/SmartImage";

export const dynamic = "force-dynamic";

export default async function NftHomePage() {
  type NftItemRow = Awaited<ReturnType<typeof prisma.nftItem.findMany>>[number] & { collection?: { creatorId: string; creator?: { name?: string | null } | null } | null; owner?: { name?: string | null } | null };

  const items = prisma
    ? await prisma.nftItem.findMany({
        orderBy: { createdAt: "desc" },
        take: 24,
        include: {
          collection: {
            select: {
              id: true,
              title: true,
              creatorId: true,
              creator: { select: { id: true, name: true } },
            },
          },
          owner: { select: { id: true, name: true } },
          video: { select: { id: true, title: true } },
        },
      })
    : [];

  return (
    <main className="mx-auto max-w-6xl space-y-6">
      <section className="lux-panel">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-[0.3em] text-zinc-500">NFT Exchange</div>
            <h1 className="lux-title">Luxury NFT marketplace</h1>
            <p className="muted mt-1 text-sm">
              Curated collections, verified drops, and premium assets for professional collectors.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="lux-pill">Verified</span>
            <span className="lux-pill">High floor</span>
            <span className="lux-pill">Rare drops</span>
            <Link className="btn btn-primary" href="/nft/market">
              Open market
            </Link>
          </div>
        </div>
      </section>

      <section className="lux-panel">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-lg font-semibold">Mint & manage</div>
            <div className="muted text-sm">
              Premium+ collectors can mint, list, and trade with Stars.
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link className="btn" href="/nft/market">
              NFT Market
            </Link>
            <Link className="btn" href="/nft/mint">
              Mint NFT
            </Link>
          </div>
        </div>
      </section>

      <section className="lux-panel">
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="text-lg font-semibold">Latest mints</div>
            <div className="muted text-sm">Recently minted collector pieces.</div>
          </div>
          <Link className="btn btn-ghost" href="/nft/market">
            View market
          </Link>
        </div>
        {items.length === 0 ? (
          <div className="muted mt-4 text-sm">No NFTs minted yet.</div>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {(items as NftItemRow[]).map((it: NftItemRow) => {
              const img = it.imageKey ? `${env.R2_PUBLIC_BASE_URL}/${it.imageKey}` : null;
              return (
                <div key={it.id} className="card">
                  <div className="overflow-hidden rounded-2xl bg-zinc-100 dark:bg-zinc-800" style={{ aspectRatio: "1/1" }}>
                    {img ? (
                      <SmartImage src={img} alt={it.name} fill className="object-cover" sizes="(max-width: 768px) 100vw, 240px" />
                    ) : (
                      <div className="h-full w-full rounded-2xl bg-zinc-900/80" />
                    )}
                  </div>
                  <div className="mt-3 text-sm font-semibold line-clamp-2">{it.name}</div>
                  <div className="muted text-xs">
                    by{" "}
                    {it.collection ? (
                      <Link className="underline" href={`/u/${it.collection.creatorId}`}>
                        {it.collection.creator?.name || "Unknown"}
                      </Link>
                    ) : (
                      "Unknown"
                    )}
                  </div>
                  <div className="muted text-xs">
                    Owner:{" "}
                    <Link className="underline" href={`/u/${it.ownerId}`}>
                      {it.owner?.name || "Unknown"}
                    </Link>
                  </div>
                  {it.videoId ? (
                    <div className="mt-2 text-xs">
                      <Link className="underline" href={`/v/${it.videoId}`}>
                        Watch source video
                      </Link>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
