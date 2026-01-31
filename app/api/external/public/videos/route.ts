import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { resolveMediaUrl } from "@/lib/mediaUrl";
import { requireApiKey } from "@/lib/externalAuth";

export const runtime = "nodejs";

const querySchema = z.object({
  q: z.string().optional(),
  tag: z.string().optional(),
  category: z.string().optional(),
  authorId: z.string().optional(),
  sort: z.enum(["new", "views", "likes"]).optional(),
  page: z.coerce.number().int().min(1).max(1000).optional(),
  take: z.coerce.number().int().min(1).max(50).optional(),
  includeSensitive: z.coerce.boolean().optional(),
});

function pickOrderBy(sort: string | undefined) {
  switch (sort) {
    case "views":
      return [{ viewCount: "desc" as const }, { createdAt: "desc" as const }];
    case "likes":
      return [{ likeCount: "desc" as const }, { createdAt: "desc" as const }];
    case "new":
    default:
      return [{ createdAt: "desc" as const }];
  }
}

export async function OPTIONS(req: Request) {
  const key = await requireApiKey(req, ["public/videos"]);
  if (key instanceof Response) return key;
  return new Response(null, { status: 204, headers: key.cors });
}

export async function GET(req: Request) {
  const key = await requireApiKey(req, ["public/videos"]);
  if (key instanceof Response) return key;

  const url = new URL(req.url);
  const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams.entries()));
  if (!parsed.success) {
    return Response.json({ ok: false, error: "INVALID_QUERY" }, { status: 400, headers: key.cors });
  }

  const { q, tag, category, authorId, sort } = parsed.data;
  const page = parsed.data.page ?? 1;
  const take = parsed.data.take ?? 24;
  const includeSensitive = parsed.data.includeSensitive ?? false;

  const qq = (q ?? "").trim().slice(0, 200);

  const where: any = {
    status: "PUBLISHED",
    access: "PUBLIC",
    ...(includeSensitive ? {} : { isSensitive: false }),
  };

  if (qq) {
    where.OR = [{ title: { contains: qq } }, { description: { contains: qq } }];
  }
  if (tag) {
    where.tags = { some: { tag: { slug: tag } } };
  }
  if (category) {
    where.category = { slug: category };
  }
  if (authorId) {
    where.authorId = authorId;
  }

  type PublicVideoRow = Awaited<ReturnType<typeof prisma.video.findMany>>[number] & {
    author?: { id: string; name: string | null; username: string | null; image: string | null } | null;
    channel?: { id: string; name: string; slug: string } | null;
    category?: { id: string; name: string; slug: string } | null;
    tags?: { tag: { slug: string; name: string } }[];
  };

  const items = await prisma.video.findMany({
    where,
    orderBy: pickOrderBy(sort),
    skip: (page - 1) * take,
    take,
    select: {
      id: true,
      title: true,
      description: true,
      createdAt: true,
      durationSec: true,
      viewCount: true,
      likeCount: true,
      commentCount: true,
      isSensitive: true,
      thumbKey: true,
      masterM3u8Key: true,
      author: { select: { id: true, name: true, username: true, image: true } },
      channel: { select: { id: true, name: true, slug: true } },
      category: { select: { id: true, name: true, slug: true } },
      tags: { take: 20, select: { tag: { select: { slug: true, name: true } } } },
    },
  });

  const total = await prisma.video.count({ where });

  const mapped = (items as PublicVideoRow[]).map((v: PublicVideoRow) => ({
    id: v.id,
    title: v.title,
    description: v.description,
    createdAt: v.createdAt,
    durationSec: v.durationSec,
    viewCount: v.viewCount,
    likeCount: v.likeCount,
    commentCount: v.commentCount,
    isSensitive: v.isSensitive,
    watchUrl: `/v/${v.id}`,
    thumbUrl: resolveMediaUrl(v.thumbKey) ?? null,
    hlsUrl: resolveMediaUrl(v.masterM3u8Key) ?? null,
    author: v.author,
    channel: v.channel,
    category: v.category,
    tags: (v.tags as { tag: { slug: string; name: string } }[]).map((t) => t.tag),
  }));

  return Response.json(
    {
      ok: true,
      page,
      take,
      total,
      items: mapped,
    },
    { headers: key.cors },
  );
}
