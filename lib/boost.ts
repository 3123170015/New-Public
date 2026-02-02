import type { PrismaClient } from "@prisma/client";

type BoostPlanType = "DURATION" | "TARGET_INTERACTIONS";

type BoostField = "statViews" | "statLikes" | "statShares" | "statComments" | "statStars" | "statGifts";
type BoostPostField = "statComments" | "statStars" | "statGifts" | "statShares";

export async function incBoostStat(tx: PrismaClient, videoId: string, field: BoostField, incBy = 1) {
  if (incBy <= 0) return;
  const now = new Date();
  const order = await tx.boostOrder.findFirst({
    where: {
      videoId,
      status: "ACTIVE",
      OR: [{ endAt: null }, { endAt: { gt: now } }],
    },
    orderBy: { startAt: "desc" },
    include: { plan: true },
  });
  if (!order) return;

  const updated = await tx.boostOrder.update({
    where: { id: order.id },
    data: { [field]: { increment: incBy } as any },
    include: { plan: true },
  });

  // Auto-expire for DURATION when time passed
  if (updated.plan.type === ("DURATION" as BoostPlanType) && updated.endAt && updated.endAt <= now) {
    await tx.boostOrder.update({ where: { id: updated.id }, data: { status: "EXPIRED" } });
    return;
  }

  // Auto-expire for TARGET_INTERACTIONS
  if (updated.plan.type === ("TARGET_INTERACTIONS" as BoostPlanType)) {
    const t = updated.plan;
    const ok =
      (t.targetViews == null || updated.statViews >= t.targetViews) &&
      (t.targetLikes == null || updated.statLikes >= t.targetLikes) &&
      (t.targetShares == null || updated.statShares >= t.targetShares) &&
      (t.targetComments == null || updated.statComments >= t.targetComments) &&
      (t.targetStars == null || updated.statStars >= t.targetStars) &&
      (t.targetGifts == null || updated.statGifts >= t.targetGifts);

    if (ok) {
      await tx.boostOrder.update({ where: { id: updated.id }, data: { status: "EXPIRED", endAt: now } });
    }
  }
}

export async function getActiveBoostedVideos(tx: PrismaClient, take = 20) {
  const now = new Date();
  const orders = await tx.boostOrder.findMany({
    where: { status: "ACTIVE", OR: [{ endAt: null }, { endAt: { gt: now } }], video: { status: "PUBLISHED" } },
    orderBy: { startAt: "desc" },
    take,
    include: { video: true, plan: true },
  });
  return orders;
}

export async function incBoostPostStat(tx: PrismaClient, postId: string, field: BoostPostField, incBy = 1) {
  if (incBy <= 0) return;
  const now = new Date();
  const order = await tx.boostPostOrder.findFirst({
    where: {
      postId,
      status: "ACTIVE",
      OR: [{ endAt: null }, { endAt: { gt: now } }],
    },
    orderBy: { startAt: "desc" },
    include: { plan: true },
  });
  if (!order) return;

  const updated = await tx.boostPostOrder.update({
    where: { id: order.id },
    data: { [field]: { increment: incBy } as any },
    include: { plan: true },
  });

  if (updated.plan.type === ("DURATION" as BoostPlanType) && updated.endAt && updated.endAt <= now) {
    await tx.boostPostOrder.update({ where: { id: updated.id }, data: { status: "EXPIRED" } });
    return;
  }

  if (updated.plan.type === ("TARGET_INTERACTIONS" as BoostPlanType)) {
    const t = updated.plan;
    const ok =
      (t.targetComments == null || updated.statComments >= t.targetComments) &&
      (t.targetStars == null || updated.statStars >= t.targetStars) &&
      (t.targetGifts == null || updated.statGifts >= t.targetGifts) &&
      (t.targetShares == null || updated.statShares >= t.targetShares);
    if (ok) {
      await tx.boostPostOrder.update({ where: { id: updated.id }, data: { status: "EXPIRED", endAt: now } });
    }
  }
}
