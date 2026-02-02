import { prisma } from "@/lib/prisma";
import { requireApiKey } from "@/lib/externalAuth";

export const runtime = "nodejs";

export async function OPTIONS(req: Request) {
  const key = await requireApiKey(req, ["public/videos"]);
  if (key instanceof Response) return key;
  return new Response(null, { status: 204, headers: key.cors });
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const key = await requireApiKey(req, ["public/videos"]);
  if (key instanceof Response) return key;
  const { id } = await params;

  const video = await prisma.video.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      description: true,
      status: true,
      access: true,
      thumbKey: true,
      createdAt: true,
      viewCount: true,
      likeCount: true,
      commentCount: true,
      shareCount: true,
      starCount: true,
      giftCount: true,
      author: { select: { id: true, name: true } },
    },
  });
  if (!video || video.status !== "PUBLISHED" || video.access !== "PUBLIC") {
    return Response.json({ ok: false, error: "NOT_FOUND" }, { status: 404, headers: key.cors });
  }

  return Response.json({ ok: true, video }, { headers: key.cors });
}
