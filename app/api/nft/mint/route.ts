import { auth } from "@/lib/auth";
import { requireExternalUser } from "@/lib/externalAuth";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { redirect } from "next/navigation";
import { getActiveMembershipTier } from "@/lib/membership";
import { getSiteConfig } from "@/lib/siteConfig";
import { releaseMaturedHolds } from "@/lib/stars/holds";

export async function POST(req: Request) {
  const external = await requireExternalUser(req, ["nft/write", "user/write"]);
  if (!(external instanceof Response)) {
    const out = await handleMint(req, external.user.id, external.user);
    return Response.json(out.body, { status: out.status, headers: external.cors });
  }

  const session = await auth();
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const out = await handleMint(req, userId, session?.user as any);
  if (out.redirectTo) {
    redirect(out.redirectTo);
  }
  return Response.json(out.body, { status: out.status });
}

async function handleMint(req: Request, userId: string, sessionUser: any): Promise<{ status: number; body: any; redirectTo?: string }> {

  const tier = getActiveMembershipTier(sessionUser ?? ({} as any));
  if (tier !== "PREMIUM_PLUS") {
    return { status: 403, body: { error: "Premium+ required" } };
  }

  const form = await req.formData();
  const videoId = String(form.get("videoId") || "");
  if (!videoId) {
    return { status: 400, body: { error: "Missing videoId" } };
  }

  const cfg = await getSiteConfig();
  const itemFee = (cfg as any).nftItemMintFeeStars ?? 10;
  const collectionFee = (cfg as any).nftCollectionMintFeeStars ?? 50;
  const treasuryUserId = (cfg as any).treasuryUserId as string | null | undefined;
  // Opportunistically release matured holds so mint fee check uses up-to-date balance.
  await releaseMaturedHolds(userId).catch(() => null);


  const [me, video, existing] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { id: true, name: true, starBalance: true } }),
    prisma.video.findUnique({ where: { id: videoId }, select: { id: true, authorId: true, title: true, description: true, thumbKey: true, status: true } }),
    prisma.nftItem.findUnique({ where: { videoId } }),
  ]);

  // Find or create a default collection for this user.
  const collection = await prisma.nftCollection.findFirst({
    where: { creatorId: userId },
    orderBy: { createdAt: "asc" },
  });

  if (!me) {
    return { status: 404, body: { error: "User not found" } };
  }
  if (!video || video.authorId !== userId) {
    return { status: 404, body: { error: "Video not found" } };
  }
  if (video.status !== "PUBLISHED") {
    return { status: 400, body: { error: "Video must be PUBLISHED" } };
  }
  if (existing) {
    return { status: 409, body: { error: "Video already minted" } };
  }
  // If user has no collection yet, they'll also pay the collection fee.
  const needsCollection = !collection;
  const totalFee = Number(itemFee) + (needsCollection ? Number(collectionFee) : 0);
  if (me.starBalance < totalFee) {
    return { status: 400, body: { error: "Not enough stars" } };
  }

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const col = collection
      ? collection
      : await tx.nftCollection.create({
          data: {
            creatorId: userId,
            title: `${me.name || "User"}'s NFTs`,
            description: "Internal NFTs minted from videos",
            royaltyBps: (cfg as any).nftDefaultRoyaltyBps ?? 500,
            creatorRoyaltySharePct: 50,
          },
        });

    await tx.nftItem.create({
      data: {
        collectionId: col.id,
        ownerId: userId,
        videoId: video.id,
        name: video.title,
        description: video.description || "",
        imageKey: video.thumbKey,
      },
    });

    await tx.user.update({ where: { id: userId }, data: { starBalance: { decrement: totalFee } } });

    await tx.starTransaction.create({
      data: {
        userId,
        type: "NFT_MINT",
        delta: -totalFee,
        stars: totalFee,
        quantity: 1,
        videoId: video.id,
        note: needsCollection
          ? `Mint NFT + create collection from video ${video.id}`
          : `Mint NFT from video ${video.id}`,
      },
    });

    // Fees go to treasury/admin user (if configured).
    if (treasuryUserId) {
      await tx.user.update({ where: { id: treasuryUserId }, data: { starBalance: { increment: totalFee } } }).catch(() => null);
      await tx.starTransaction.create({
        data: {
          userId: treasuryUserId,
          type: "ADMIN_GRANT",
          delta: totalFee,
          stars: totalFee,
          quantity: 1,
          videoId: video.id,
          note: `Treasury: receive NFT mint fee from user ${userId}`,
        },
      }).catch(() => null);
    }
  });

  if (req.headers.get("content-type")?.includes("application/json")) {
    return { status: 200, body: { ok: true, userId } };
  }
  return { status: 200, body: { ok: true }, redirectTo: `/u/${userId}/nfts` };
}
