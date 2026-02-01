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

  const take = parsed.data.take ?? 12;
  const [latestVideos, latestPosts, latestComments] = await prisma.$transaction([
    prisma.video.findMany({
      where: { status: "PUBLISHED", deletedAt: null },
      orderBy: { createdAt: "desc" },
      take,
      select: { id: true, title: true, createdAt: true, viewCount: true, commentCount: true, likeCount: true },
    }),
    prisma.communityPost.findMany({
      where: { isDeleted: false },
      orderBy: { createdAt: "desc" },
      take,
      select: { id: true, type: true, text: true, createdAt: true, authorId: true },
    }),
    prisma.comment.findMany({
      where: { visibility: "VISIBLE" },
      orderBy: { createdAt: "desc" },
      take,
      select: { id: true, videoId: true, userId: true, createdAt: true, isSuperThanks: true, superThanksStars: true },
    }),
  ]);

  return Response.json(
    {
      ok: true,
      latestVideos,
      latestPosts,
      latestComments,
    },
    { headers: key.cors },
  );
}
