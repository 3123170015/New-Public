import { prisma } from "@/lib/prisma";
import { requireExternalUser } from "@/lib/externalAuth";

export const runtime = "nodejs";

export async function OPTIONS(req: Request) {
  const auth = await requireExternalUser(req, ["creator-stats/revenue"]);
  if (auth instanceof Response) return auth;
  return new Response(null, { status: 204, headers: auth.cors });
}

export async function GET(req: Request) {
  const auth = await requireExternalUser(req, ["creator-stats/revenue"]);
  if (auth instanceof Response) return auth;
  if (!prisma) return Response.json({ ok: false, error: "DB_NOT_READY" }, { status: 503, headers: auth.cors });

  const creatorId = auth.user.id;
  const [tipAgg, membershipAgg] = await prisma.$transaction([
    prisma.creatorTip.aggregate({ where: { toUserId: creatorId }, _sum: { stars: true }, _count: true }),
    prisma.creatorMembershipPurchase.aggregate({ where: { creatorId }, _sum: { stars: true }, _count: true }),
  ]);

  return Response.json(
    {
      ok: true,
      starsFromTips: Number(tipAgg._sum.stars ?? 0),
      tipCount: tipAgg._count ?? 0,
      starsFromMemberships: Number(membershipAgg._sum.stars ?? 0),
      membershipPurchases: membershipAgg._count ?? 0,
    },
    { headers: auth.cors },
  );
}
