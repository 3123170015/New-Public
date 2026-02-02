import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireExternalUser } from "@/lib/externalAuth";

export const runtime = "nodejs";

const bodySchema = z.object({
  itemId: z.string().min(1),
  priceStars: z.coerce.number().int().min(1).max(1_000_000_000),
});

export async function OPTIONS(req: Request) {
  const key = await requireExternalUser(req, ["nft/write", "user/write"]);
  if (key instanceof Response) return key;
  return new Response(null, { status: 204, headers: key.cors });
}

export async function POST(req: Request) {
  const result = await requireExternalUser(req, ["nft/write", "user/write"]);
  if (result instanceof Response) return result;

  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ ok: false, error: "INVALID_BODY" }, { status: 400, headers: result.cors });
  }

  try {
    await prisma.$transaction(async (tx) => {
      const item = await tx.nftItem.findUnique({
        where: { id: parsed.data.itemId },
        select: { id: true, ownerId: true, marketplaceFrozen: true, exportStatus: true },
      });
      if (!item) throw new Error("NFT_NOT_FOUND");
      if (item.ownerId !== result.user.id) throw new Error("NOT_OWNER");
      if (item.marketplaceFrozen || item.exportStatus !== "NONE") throw new Error("MARKETPLACE_FROZEN");

      const activeListing = await tx.nftListing.findFirst({ where: { itemId: parsed.data.itemId, status: "ACTIVE" }, select: { id: true } });
      if (activeListing) throw new Error("ALREADY_LISTED");

      const activeAuction = await tx.nftAuction.findFirst({ where: { itemId: parsed.data.itemId, status: "ACTIVE" }, select: { id: true } });
      if (activeAuction) throw new Error("ALREADY_IN_AUCTION");

      await tx.nftListing.create({
        data: {
          itemId: parsed.data.itemId,
          sellerId: result.user.id,
          priceStars: parsed.data.priceStars,
          status: "ACTIVE",
        },
      });
    });
  } catch (e: any) {
    return Response.json({ ok: false, error: e?.message || "FAILED" }, { status: 400, headers: result.cors });
  }

  return Response.json({ ok: true }, { headers: result.cors });
}
