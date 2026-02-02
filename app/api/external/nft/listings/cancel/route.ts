import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireExternalUser } from "@/lib/externalAuth";

export const runtime = "nodejs";

const bodySchema = z.object({
  listingId: z.string().min(1),
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
      const listing = await tx.nftListing.findUnique({
        where: { id: parsed.data.listingId },
        select: { id: true, sellerId: true, status: true },
      });
      if (!listing) throw new Error("LISTING_NOT_FOUND");
      if (listing.sellerId !== result.user.id) throw new Error("FORBIDDEN");
      if (listing.status !== "ACTIVE") return;
      await tx.nftListing.update({ where: { id: listing.id }, data: { status: "CANCELLED", cancelledAt: new Date() } });
    });
  } catch (e: any) {
    return Response.json({ ok: false, error: e?.message || "FAILED" }, { status: 400, headers: result.cors });
  }

  return Response.json({ ok: true }, { headers: result.cors });
}
