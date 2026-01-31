import { z } from "zod";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";
import { calcCouponBonusStars, getValidCouponTx, normalizeCouponCode } from "@/lib/coupons";
import { getOrInitPaymentConfig } from "@/lib/payments/config";
import { templateMemo } from "@/lib/payments/memo";
import { requireExternalUser } from "@/lib/externalAuth";

export const runtime = "nodejs";

const schema = z.object({
  packageId: z.string().min(1),
  couponCode: z.string().min(1).max(64).optional(),
});

export async function OPTIONS(req: Request) {
  const key = await requireExternalUser(req, ["stars/topup/intent", "user/write"]);
  if (key instanceof Response) return key;
  return new Response(null, { status: 204, headers: key.cors });
}

export async function POST(req: Request) {
  const result = await requireExternalUser(req, ["stars/topup/intent", "user/write"]);
  if (result instanceof Response) return result;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, error: "INVALID_JSON" }, { status: 400, headers: result.cors });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ ok: false, error: "INVALID_INPUT" }, { status: 400, headers: result.cors });
  }

  const pkg = await prisma.starTopupPackage.findUnique({
    where: { id: parsed.data.packageId },
    include: { token: true },
  });
  if (!pkg || !pkg.active) {
    return Response.json({ ok: false, error: "PACKAGE_NOT_FOUND" }, { status: 404, headers: result.cors });
  }

  const addr = await prisma.custodialAddress.findFirst({
    where: { chain: pkg.chain, active: true },
    orderBy: { createdAt: "asc" },
  });
  if (!addr) {
    return Response.json({ ok: false, error: "NO_CUSTODIAL_ADDRESS" }, { status: 400, headers: result.cors });
  }

  const userId = result.user.id;

  let couponId: string | undefined;
  let couponCode: string | undefined;
  let couponBonusPreview = 0;
  if (parsed.data.couponCode) {
    try {
      couponCode = normalizeCouponCode(parsed.data.couponCode);
      const coupon = await prisma.$transaction(async (tx: Prisma.TransactionClient) =>
        getValidCouponTx(tx as any, { code: couponCode!, userId, appliesTo: "TOPUP" })
      );
      couponId = coupon.id;
      couponBonusPreview = calcCouponBonusStars(coupon as any, pkg.stars);
    } catch (e: any) {
      return Response.json({ ok: false, error: e?.message || "COUPON_INVALID" }, { status: 400, headers: result.cors });
    }
  }

  const bundleBonusPreview = Number((pkg as any).bonusStars || 0);
  const totalStarsPreview = pkg.stars + Math.max(0, bundleBonusPreview) + Math.max(0, couponBonusPreview);

  const deposit = await prisma.starDeposit.create({
    data: {
      userId,
      chain: pkg.chain,
      tokenId: pkg.tokenId,
      packageId: pkg.id,
      couponId: couponId,
      couponCode: couponCode,
      custodialAddressId: addr.id,
      expectedAmount: pkg.expectedAmount,
      memo: pkg.chain === "SOLANA" ? "" : undefined,
      status: "CREATED",
      provider: "MANUAL",
      events: {
        create: { type: "INTENT_CREATED", message: "External client created deposit intent" },
      },
    },
    include: { token: true, custodialAddress: true, package: true },
  });

  const paymentCfg = await getOrInitPaymentConfig();
  const memoTemplate = paymentCfg.depositMemoFormat || "DEPOSIT:{depositId}";
  const memo = deposit.chain === "SOLANA" ? templateMemo(memoTemplate, deposit.id) : "";
  if (deposit.chain === "SOLANA") {
    await prisma.starDeposit.update({ where: { id: deposit.id }, data: { memo } });
  }

  return Response.json(
    {
      ok: true,
      deposit: {
        id: deposit.id,
        chain: deposit.chain,
        assetSymbol: deposit.token?.symbol,
        expectedAmount: deposit.expectedAmount?.toString() || null,
        toAddress: deposit.custodialAddress.address,
        memo,
        stars: deposit.package?.stars || null,
        bonusStars: (deposit.package as any)?.bonusStars ?? 0,
        couponBonus: couponBonusPreview,
        totalStars: totalStarsPreview,
        couponCode: couponCode || null,
      },
    },
    { headers: result.cors }
  );
}
