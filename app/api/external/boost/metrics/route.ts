import { prisma } from "@/lib/prisma";
import { requireExternalUser } from "@/lib/externalAuth";
import { rateLimit } from "@/lib/rateLimit";
import { z } from "zod";

export const runtime = "nodejs";

const schema = z.object({
  videoId: z.string().min(1).optional(),
  postId: z.string().min(1).optional(),
});

export async function OPTIONS(req: Request) {
  const auth = await requireExternalUser(req, ["boost/metrics"]);
  if (auth instanceof Response) return auth;
  const rl = await rateLimit(`external:boost-metrics:${auth.user.id}`, 20, 60_000);
  if (!rl.ok) {
    return Response.json({ ok: false, error: "RATE_LIMIT" }, { status: 429, headers: auth.cors });
  }
  return new Response(null, { status: 204, headers: auth.cors });
}

export async function POST(req: Request) {
  const auth = await requireExternalUser(req, ["boost/metrics"]);
  if (auth instanceof Response) return auth;
  const body = schema.parse(await req.json());
  if (!body.videoId && !body.postId) {
    return Response.json({ ok: false, error: "MISSING_TARGET" }, { status: 400, headers: auth.cors });
  }
  if (body.videoId && body.postId) {
    return Response.json({ ok: false, error: "ONLY_ONE_TARGET" }, { status: 400, headers: auth.cors });
  }

  if (body.videoId) {
    const order = await prisma.boostOrder.findFirst({
      where: { videoId: body.videoId, status: "ACTIVE" },
      orderBy: { startAt: "desc" },
      select: {
        id: true,
        startAt: true,
        endAt: true,
        statViews: true,
        statComments: true,
        statStars: true,
        statGifts: true,
        statShares: true,
      },
    });
    return Response.json(
      {
        ok: true,
        target: "video",
        videoId: body.videoId,
        order,
      },
      { headers: auth.cors },
    );
  }

  const order = await prisma.boostPostOrder.findFirst({
    where: { postId: body.postId!, status: "ACTIVE" },
    orderBy: { startAt: "desc" },
    select: { id: true, startAt: true, endAt: true, statComments: true, statStars: true, statGifts: true, statShares: true },
  });

  return Response.json(
    {
      ok: true,
      target: "post",
      postId: body.postId,
      order,
    },
    { headers: auth.cors },
  );
}
