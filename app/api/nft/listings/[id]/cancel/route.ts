import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { redirect } from "next/navigation";

export const runtime = "nodejs";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) return Response.json({ error: "UNAUTHORIZED" }, { status: 401 });
  return handleCancel(req, params.id, userId);
}

async function handleCancel(req: Request, listingId: string, userId: string) {

  const form = await req.formData();
  const back = String(form.get("back") || req.headers.get("referer") || "/nft/market");

  await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const listing = await tx.nftListing.findUnique({
        where: { id: listingId },
        select: { id: true, sellerId: true, status: true },
      });
      if (!listing) throw new Error("LISTING_NOT_FOUND");
      if (listing.sellerId !== userId) throw new Error("FORBIDDEN");
      if (listing.status !== "ACTIVE") return;

      await tx.nftListing.update({
        where: { id: listing.id },
        data: { status: "CANCELLED", cancelledAt: new Date() },
      });
  });

  redirect(back);
}
