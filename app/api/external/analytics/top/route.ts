import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiKey } from "@/lib/externalAuth";

export const runtime = "nodejs";

const querySchema = z.object({
  take: z.coerce.number().int().min(1).max(50).optional(),
});

export async function OPTIONS(req: Request) {
  const key = await requireApiKey(req, ["analytics/read"]);
  if (key instanceof Response) return key;
  return new Response(null, { status: 204, headers: key.cors });
}

export async function GET(req: Request) {
  const key = await requireApiKey(req, ["analytics/read"]);
  if (key instanceof Response) return key;

  const url = new URL(req.url);
  const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams.entries()));
  if (!parsed.success) {
    return Response.json({ ok: false, error: "INVALID_QUERY" }, { status: 400, headers: key.cors });
  }

  const take = parsed.data.take ?? 10;

  const [topComments, topUsers] = await prisma.$transaction([
    prisma.comment.findMany({
      where: { visibility: "VISIBLE" },
      orderBy: [{ isSuperThanks: "desc" }, { superThanksStars: "desc" }, { createdAt: "desc" }],
      take,
      select: {
        id: true,
        videoId: true,
        userId: true,
        createdAt: true,
        isSuperThanks: true,
        superThanksStars: true,
        superThanksQty: true,
      },
    }),
    prisma.user.findMany({
      take,
      orderBy: [{ videos: { _count: "desc" } }, { comments: { _count: "desc" } }],
      select: {
        id: true,
        username: true,
        name: true,
        _count: { select: { videos: true, comments: true, communityPosts: true } },
      },
    }),
  ]);

  return Response.json(
    {
      ok: true,
      topComments,
      topCreators: topUsers.map((user) => ({
        id: user.id,
        username: user.username,
        name: user.name,
        videoCount: user._count.videos,
        postCount: user._count.communityPosts,
        commentCount: user._count.comments,
      })),
    },
    { headers: key.cors },
  );
}
