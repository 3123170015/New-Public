import { auth } from "@/lib/auth";
import { requireExternalUser } from "@/lib/externalAuth";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { redirect } from "next/navigation";

export const runtime = "nodejs";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const external = await requireExternalUser(req, ["nft/write", "user/write"]);
  if (!(external instanceof Response)) {
    return handleCancel(req, params.id, external.user.id, external.cors);
  }

  const session = await auth();
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
  return handleCancel(req, params.id, userId);
}

async function handleCancel(req: Request, auctionId: string, userId: string, headers?: HeadersInit) {

  const form = await req.formData();
  const back = String(form.get("back") || req.headers.get("referer") || "/nft/market");

  try {
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const auction = await tx.nftAuction.findUnique({ where: { id: auctionId }, include: { bids: { select: { id: true }, take: 1 } } });
      if (!auction) throw new Error("AUCTION_NOT_FOUND");
      if (auction.status !== "ACTIVE") throw new Error("AUCTION_NOT_ACTIVE");
      if (auction.sellerId !== userId) throw new Error("FORBIDDEN");

    const hasBid = auction.bids.length > 0;
    if (hasBid) throw new Error("CANNOT_CANCEL_WITH_BIDS");

    const updated = await tx.nftAuction.updateMany({ where: { id: auction.id, status: "ACTIVE" }, data: { status: "CANCELLED" } });
    if (updated.count !== 1) throw new Error("RACE_CANCEL");

      await tx.nftEventLog.create({
        data: {
          actorId: userId,
          action: "NFT_AUCTION_CANCELLED",
          dataJson: JSON.stringify({ auctionId: auction.id }),
        },
      });
    });
  } catch (e: any) {
    return Response.json({ ok: false, error: e?.message || "FAILED" }, { status: 400, headers });
  }

  if (form.get("back")) {
    redirect(back);
  }
  return Response.json({ ok: true }, { status: 200, headers });
}
