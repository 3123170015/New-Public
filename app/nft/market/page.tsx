import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import SmartImage from "@/components/media/SmartImage";

export const dynamic = "force-dynamic";

export default async function NftMarketPage() {
  type ListingRow = Awaited<ReturnType<typeof prisma.nftListing.findMany>>[number] & { item?: { id: string; name: string; imageKey: string | null; videoId: string | null } | null; seller?: { name: string | null } | null };
  type AuctionRow = Awaited<ReturnType<typeof prisma.nftAuction.findMany>>[number] & { item?: { id: string; name: string; imageKey: string | null; videoId: string | null } | null; seller?: { name: string | null } | null; highestBid?: { amountStars: number } | null };

  const [listings, auctions] = prisma
    ? await Promise.all([
        prisma.nftListing.findMany({
          where: { status: "ACTIVE", item: { exportStatus: "NONE", marketplaceFrozen: false } },
          orderBy: { createdAt: "desc" },
          take: 48,
          include: {
            seller: { select: { id: true, name: true } },
            item: {
              include: {
                collection: { select: { id: true, title: true, creatorId: true, creator: { select: { id: true, name: true } } } },
                owner: { select: { id: true, name: true } },
                video: { select: { id: true, title: true } },
              },
            },
          },
        }),
        prisma.nftAuction.findMany({
          where: { status: "ACTIVE", endAt: { gt: new Date() }, item: { exportStatus: "NONE", marketplaceFrozen: false } },
          orderBy: { endAt: "asc" },
          take: 48,
          include: {
            seller: { select: { id: true, name: true } },
            highestBid: { select: { amountStars: true } },
            item: {
              include: {
                collection: { select: { id: true, title: true, creatorId: true, creator: { select: { id: true, name: true } } } },
                owner: { select: { id: true, name: true } },
                video: { select: { id: true, title: true } },
              },
            },
          },
        }),
      ])
    : [[], []];

  return (
    <main className="mx-auto max-w-6xl space-y-6">
      <section className="lux-panel">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-[0.3em] text-zinc-500">NFT Exchange</div>
            <h1 className="lux-title">Marketplace hub</h1>
            <p className="muted mt-1 text-sm">Live listings and auctions for verified drops.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="lux-pill">Curated</span>
            <span className="lux-pill">Verified sellers</span>
            <Link className="btn" href="/nft">
              NFT Home
            </Link>
            <Link className="btn btn-primary" href="/nft/mint">
              Mint NFT
            </Link>
          </div>
        </div>
      </section>

      <section className="lux-panel">
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="text-lg font-semibold">Live listings</div>
            <div className="muted text-sm">Fixed-price items available now.</div>
          </div>
          <Link className="btn btn-ghost" href="/nft">
            Overview
          </Link>
        </div>
        {listings.length === 0 ? (
          <div className="muted mt-4 text-sm">No active listings.</div>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {(listings as ListingRow[]).map((l: ListingRow) => {
              const it = l.item;
              if (!it) return null;
              const img = it.imageKey ? `${env.R2_PUBLIC_BASE_URL}/${it.imageKey}` : null;
              return (
                <Link key={l.id} href={`/nft/items/${it.id}`} className="card">
                  <div className="overflow-hidden rounded-2xl bg-zinc-100 dark:bg-zinc-800" style={{ aspectRatio: "1/1" }}>
                    {img ? (
                      <SmartImage src={img} alt={it.name} fill className="object-cover" sizes="(max-width: 768px) 100vw, 240px" />
                    ) : (
                      <div className="h-full w-full rounded-2xl bg-zinc-900/80" />
                    )}
                  </div>
                  <div className="mt-3 text-sm font-semibold line-clamp-2">{it.name}</div>
                  <div className="muted text-xs">
                    Price: <span className="font-semibold">{l.priceStars}</span> ★
                  </div>
                  <div className="muted text-xs">Seller: {l.seller?.name || "Unknown"}</div>
                  {it.videoId ? (
                    <div className="mt-2 text-xs underline">Watch source</div>
                  ) : null}
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <section className="lux-panel">
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="text-lg font-semibold">Live auctions</div>
            <div className="muted text-sm">Competitive bids for rare drops.</div>
          </div>
        </div>
        {auctions.length === 0 ? (
          <div className="muted mt-4 text-sm">No active auctions.</div>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {(auctions as AuctionRow[]).map((a: AuctionRow) => {
              const it = a.item;
              if (!it) return null;
              const img = it.imageKey ? `${env.R2_PUBLIC_BASE_URL}/${it.imageKey}` : null;
              const current = a.highestBid?.amountStars ?? a.startPriceStars;
              return (
                <Link key={a.id} href={`/nft/items/${it.id}`} className="card">
                  <div className="overflow-hidden rounded-2xl bg-zinc-100 dark:bg-zinc-800" style={{ aspectRatio: "1/1" }}>
                    {img ? (
                      <SmartImage src={img} alt={it.name} fill className="object-cover" sizes="(max-width: 768px) 100vw, 240px" />
                    ) : (
                      <div className="h-full w-full rounded-2xl bg-zinc-900/80" />
                    )}
                  </div>
                  <div className="mt-3 text-sm font-semibold line-clamp-2">{it.name}</div>
                  <div className="muted text-xs">
                    Current bid: <span className="font-semibold">{current}</span> ★
                  </div>
                  <div className="muted text-xs">Ends: {new Date(a.endAt).toLocaleString()}</div>
                  <div className="muted text-xs">Seller: {a.seller?.name || "Unknown"}</div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}
