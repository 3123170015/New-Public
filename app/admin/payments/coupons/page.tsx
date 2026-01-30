import { prisma } from "@/lib/prisma";
import CouponsClient from "./ui/CouponsClient";

export const dynamic = "force-dynamic";

export default async function CouponsAdminPage() {
  const coupons = await prisma.coupon.findMany({ orderBy: { updatedAt: "desc" }, take: 200 });
  const initialCoupons = coupons.map((c) => ({
    ...c,
    startsAt: c.startsAt ? c.startsAt.toISOString() : null,
    endsAt: c.endsAt ? c.endsAt.toISOString() : null,
    updatedAt: c.updatedAt.toISOString(),
    createdAt: c.createdAt.toISOString(),
  }));
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">Coupons</h2>
        <p className="text-sm text-muted-foreground">Create and manage coupon codes for Stars Topup (bonus stars) and Season Pass (discount).</p>
      </div>
      <CouponsClient initialCoupons={initialCoupons} />
    </div>
  );
}
