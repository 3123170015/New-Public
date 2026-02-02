import { prisma } from "@/lib/prisma";
import { requireExternalUser } from "@/lib/externalAuth";

export const runtime = "nodejs";

export async function OPTIONS(req: Request) {
  const auth = await requireExternalUser(req, ["creator-stats/top-fans"]);
  if (auth instanceof Response) return auth;
  return new Response(null, { status: 204, headers: auth.cors });
}

export async function GET(req: Request) {
  const auth = await requireExternalUser(req, ["creator-stats/top-fans"]);
  if (auth instanceof Response) return auth;
  if (!prisma) return Response.json({ ok: false, error: "DB_NOT_READY" }, { status: 503, headers: auth.cors });

  const creatorId = auth.user.id;
  const tips = await prisma.creatorTip.groupBy({
    by: ["fromUserId"],
    where: { toUserId: creatorId },
    _sum: { stars: true },
    _count: true,
    orderBy: { _sum: { stars: "desc" } },
    take: 20,
  });

  const userIds = tips.map((t: (typeof tips)[number]) => t.fromUserId);
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true, username: true, image: true },
  });
  const map = new Map(users.map((u: (typeof users)[number]) => [u.id, u]));

  const topFans = tips.map((row: (typeof tips)[number]) => ({
    user: map.get(row.fromUserId) ?? { id: row.fromUserId },
    stars: Number(row._sum.stars ?? 0),
    tipCount: row._count ?? 0,
  }));

  return Response.json({ ok: true, items: topFans }, { headers: auth.cors });
}
