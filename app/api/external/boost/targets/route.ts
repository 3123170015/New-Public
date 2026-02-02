import { prisma } from "@/lib/prisma";
import { requireExternalUser } from "@/lib/externalAuth";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { releaseMaturedHoldsTx } from "@/lib/stars/holds";
import { getSiteConfig } from "@/lib/siteConfig";
import { getActiveMembershipTier } from "@/lib/membership";
import { rateLimit } from "@/lib/rateLimit";

export const runtime = "nodejs";

const schema = z.object({
  planId: z.string().min(1),
  videoId: z.string().min(1).optional(),
  postId: z.string().min(1).optional(),
});

function monthKey(now: Date) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export async function OPTIONS(req: Request) {
  const auth = await requireExternalUser(req, ["boost/targets"]);
  if (auth instanceof Response) return auth;
  return new Response(null, { status: 204, headers: auth.cors });
}

export async function POST(req: Request) {
  const auth = await requireExternalUser(req, ["boost/targets"]);
  if (auth instanceof Response) return auth;
  const body = schema.parse(await req.json());
  const rl = await rateLimit(`external:boost:${auth.user.id}`, 6, 60_000);
  if (!rl.ok) {
    return Response.json({ ok: false, error: "RATE_LIMIT" }, { status: 429, headers: auth.cors });
  }
  if (!body.videoId && !body.postId) {
    return Response.json({ ok: false, error: "MISSING_TARGET" }, { status: 400, headers: auth.cors });
  }
  if (body.videoId && body.postId) {
    return Response.json({ ok: false, error: "ONLY_ONE_TARGET" }, { status: 400, headers: auth.cors });
  }

  const [cfg, plan, user] = await Promise.all([
    getSiteConfig(),
    prisma.boostPlan.findUnique({ where: { id: body.planId } }),
    prisma.user.findUnique({ where: { id: auth.user.id }, select: { id: true, starBalance: true } }),
  ]);
  if (!plan) return Response.json({ ok: false, error: "PLAN_NOT_FOUND" }, { status: 404, headers: auth.cors });
  if (!user) return Response.json({ ok: false, error: "USER_NOT_FOUND" }, { status: 404, headers: auth.cors });

  if (body.videoId) {
    const video = await prisma.video.findUnique({
      where: { id: body.videoId },
      select: { id: true, authorId: true, status: true, viewCount: true, likeCount: true, shareCount: true, commentCount: true, starCount: true, giftCount: true },
    });
    if (!video) return Response.json({ ok: false, error: "VIDEO_NOT_FOUND" }, { status: 404, headers: auth.cors });
    if (video.authorId !== auth.user.id) return Response.json({ ok: false, error: "FORBIDDEN" }, { status: 403, headers: auth.cors });
    if (video.status !== "PUBLISHED") {
      return Response.json({ ok: false, error: "VIDEO_NOT_PUBLISHED" }, { status: 400, headers: auth.cors });
    }

    try {
      const order = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        const duplicate = await tx.boostOrder.findFirst({
          where: {
            videoId: body.videoId!,
            status: "ACTIVE",
            OR: [{ endAt: null }, { endAt: { gt: new Date() } }],
          },
          select: { id: true },
        });
        if (duplicate) throw new Error("BOOST_DUPLICATE");
        await releaseMaturedHoldsTx(tx, auth.user.id);
      let chargeStars = plan.priceStars;
      const tier = getActiveMembershipTier(auth.user as any);
      const freeQuota = Math.max(0, Number(cfg.premiumPlusFreeBoostsPerMonth ?? 0));
      if (tier === "PREMIUM_PLUS" && freeQuota > 0) {
        const key = monthKey(new Date());
        const usage = await tx.premiumBenefitUsage.upsert({
          where: { userId_month: { userId: auth.user.id, month: key } },
          update: {},
          create: { userId: auth.user.id, month: key, freeBoostsUsed: 0 },
          select: { id: true, freeBoostsUsed: true },
        });
        if (usage.freeBoostsUsed < freeQuota) {
          chargeStars = 0;
          await tx.premiumBenefitUsage.update({ where: { id: usage.id }, data: { freeBoostsUsed: { increment: 1 } } });
        }
      }
      if (chargeStars > 0) {
        const me = await tx.user.findUnique({ where: { id: auth.user.id }, select: { starBalance: true } });
        if (!me || (me.starBalance ?? 0) < chargeStars) throw new Error("INSUFFICIENT_STARS");
        await tx.user.update({ where: { id: auth.user.id }, data: { starBalance: { decrement: chargeStars } } });
        await tx.starTransaction.create({
          data: {
            userId: auth.user.id,
            delta: -chargeStars,
            stars: chargeStars,
            type: "BOOST_PURCHASE",
            note: `Boost plan ${plan.id}`,
          },
        });
      }
        return tx.boostOrder.create({
          data: {
            userId: auth.user.id,
            videoId: body.videoId!,
            planId: plan.id,
            status: "ACTIVE",
            startAt: new Date(),
            endAt: plan.durationDays ? new Date(Date.now() + plan.durationDays * 24 * 60 * 60 * 1000) : null,
            priceStars: chargeStars,
            baseViews: video.viewCount,
            baseLikes: video.likeCount,
            baseShares: video.shareCount,
            baseComments: video.commentCount,
            baseStars: video.starCount,
            baseGifts: video.giftCount,
          },
        });
      });
      return Response.json({ ok: true, target: "video", orderId: order.id }, { headers: auth.cors });
    } catch (e: any) {
      if (String(e?.message || "") === "BOOST_DUPLICATE") {
        return Response.json({ ok: false, error: "BOOST_ALREADY_ACTIVE" }, { status: 409, headers: auth.cors });
      }
      return Response.json({ ok: false, error: "BOOST_FAILED" }, { status: 500, headers: auth.cors });
    }
  }

  const post = await prisma.communityPost.findUnique({
    where: { id: body.postId },
    select: { id: true, authorId: true },
  });
  if (!post) return Response.json({ ok: false, error: "POST_NOT_FOUND" }, { status: 404, headers: auth.cors });
  if (post.authorId !== auth.user.id) return Response.json({ ok: false, error: "FORBIDDEN" }, { status: 403, headers: auth.cors });

  try {
    const postOrder = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const duplicate = await tx.boostPostOrder.findFirst({
        where: {
          postId: post.id,
          status: "ACTIVE",
          OR: [{ endAt: null }, { endAt: { gt: new Date() } }],
        },
        select: { id: true },
      });
      if (duplicate) throw new Error("BOOST_DUPLICATE");
      await releaseMaturedHoldsTx(tx, auth.user.id);
    let chargeStars = plan.priceStars;
    const tier = getActiveMembershipTier(auth.user as any);
    const freeQuota = Math.max(0, Number(cfg.premiumPlusFreeBoostsPerMonth ?? 0));
    if (tier === "PREMIUM_PLUS" && freeQuota > 0) {
      const key = monthKey(new Date());
      const usage = await tx.premiumBenefitUsage.upsert({
        where: { userId_month: { userId: auth.user.id, month: key } },
        update: {},
        create: { userId: auth.user.id, month: key, freeBoostsUsed: 0 },
        select: { id: true, freeBoostsUsed: true },
      });
      if (usage.freeBoostsUsed < freeQuota) {
        chargeStars = 0;
        await tx.premiumBenefitUsage.update({ where: { id: usage.id }, data: { freeBoostsUsed: { increment: 1 } } });
      }
    }
    if (chargeStars > 0) {
      const me = await tx.user.findUnique({ where: { id: auth.user.id }, select: { starBalance: true } });
      if (!me || (me.starBalance ?? 0) < chargeStars) throw new Error("INSUFFICIENT_STARS");
      await tx.user.update({ where: { id: auth.user.id }, data: { starBalance: { decrement: chargeStars } } });
      await tx.starTransaction.create({
        data: {
          userId: auth.user.id,
          delta: -chargeStars,
          stars: chargeStars,
          type: "BOOST_PURCHASE",
          note: `Boost plan ${plan.id}`,
        },
      });
    }
      return tx.boostPostOrder.create({
        data: {
          userId: auth.user.id,
          postId: post.id,
          planId: plan.id,
          status: "ACTIVE",
          startAt: new Date(),
          endAt: plan.durationDays ? new Date(Date.now() + plan.durationDays * 24 * 60 * 60 * 1000) : null,
          priceStars: chargeStars,
        },
      });
    });
    return Response.json({ ok: true, target: "post", orderId: postOrder.id }, { headers: auth.cors });
  } catch (e: any) {
    if (String(e?.message || "") === "BOOST_DUPLICATE") {
      return Response.json({ ok: false, error: "BOOST_ALREADY_ACTIVE" }, { status: 409, headers: auth.cors });
    }
    return Response.json({ ok: false, error: "BOOST_FAILED" }, { status: 500, headers: auth.cors });
  }
}
