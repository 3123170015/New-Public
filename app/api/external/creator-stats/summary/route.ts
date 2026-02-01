import { prisma } from "@/lib/prisma";
import { requireExternalUser } from "@/lib/externalAuth";

export const runtime = "nodejs";

export async function OPTIONS(req: Request) {
  const auth = await requireExternalUser(req, ["creator-stats/summary"]);
  if (auth instanceof Response) return auth;
  return new Response(null, { status: 204, headers: auth.cors });
}

export async function GET(req: Request) {
  const auth = await requireExternalUser(req, ["creator-stats/summary"]);
  if (auth instanceof Response) return auth;
  if (!prisma) return Response.json({ ok: false, error: "DB_NOT_READY" }, { status: 503, headers: auth.cors });

  const creatorId = auth.user.id;
  const [videoCount, followerCount, tipSum] = await prisma.$transaction([
    prisma.video.count({ where: { authorId: creatorId, status: "PUBLISHED" } }),
    prisma.subscription.count({ where: { channelUserId: creatorId } }),
    prisma.creatorTip.aggregate({ where: { toUserId: creatorId }, _sum: { stars: true } }),
  ]);

  return Response.json(
    {
      ok: true,
      creatorId,
      videoCount,
      followerCount,
      starsReceived: Number(tipSum._sum.stars ?? 0),
    },
    { headers: auth.cors },
  );
}
