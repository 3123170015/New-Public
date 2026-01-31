import { auth } from "@/lib/auth";
import { requireExternalUser } from "@/lib/externalAuth";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { redirect } from "next/navigation";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const external = await requireExternalUser(req, ["nft/write", "user/write"]);
  if (!(external instanceof Response)) {
    return handleCreate(req, external.user.id, external.cors);
  }

  const session = await auth();
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
  return handleCreate(req, userId);
}

async function handleCreate(req: Request, userId: string, headers?: HeadersInit) {

  const form = await req.formData();
  const itemId = String(form.get("itemId") || "").trim();
  const priceStars = Number(String(form.get("priceStars") || "0").trim());
  const back = String(form.get("back") || req.headers.get("referer") || "/nft/market");

  if (!itemId) return Response.json({ error: "Missing itemId" }, { status: 400, headers });
  if (!Number.isFinite(priceStars) || priceStars <= 0 || priceStars > 1_000_000_000) {
    return Response.json({ error: "Invalid priceStars" }, { status: 400, headers });
  }

  try {
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const item = await tx.nftItem.findUnique({
        where: { id: itemId },
        select: { id: true, ownerId: true, marketplaceFrozen: true, exportStatus: true },
      });
    if (!item) throw new Error("NFT_NOT_FOUND");
    if (item.ownerId !== userId) throw new Error("NOT_OWNER");
    if (item.marketplaceFrozen || item.exportStatus !== "NONE") throw new Error("MARKETPLACE_FROZEN");

    const activeListing = await tx.nftListing.findFirst({ where: { itemId, status: "ACTIVE" }, select: { id: true } });
    if (activeListing) throw new Error("ALREADY_LISTED");

    const activeAuction = await tx.nftAuction.findFirst({ where: { itemId, status: "ACTIVE" }, select: { id: true } });
    if (activeAuction) throw new Error("ALREADY_IN_AUCTION");

      await tx.nftListing.create({
        data: {
          itemId,
          sellerId: userId,
          priceStars: Math.trunc(priceStars),
          status: "ACTIVE",
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
