import { cache } from "react";
import { prisma } from "./prisma";

export const getSiteConfig = cache(async () => {
  if (!prisma) {
    return {
      id: 1,
      siteName: "VideoShare",
      defaultDescription: "VideoShare - HLS + R2",
      logoUrl: null,
      customCss: "",
      gaEnabled: false,
      gaMeasurementId: null,
      gtmContainerId: null,
      googleVerification: null,
      indexNowEnabled: false,
      indexNowKey: null,
      oneSignalEnabled: false,
      oneSignalAppId: null,
      oneSignalSafariWebId: null,
      oneSignalRestApiKey: null,
      feedTikTokEnabled: false,
      storyboardEnabled: false,
      playerP2PEnabled: false,
      sensitiveDefaultMode: "BLUR",
      treasuryUserId: null,
      premiumPriceStars: 500,
      premiumDurationDays: 30,
      premiumPlusPriceStars: 900,
      premiumPlusDurationDays: 30,
      premiumPlusFreeBoostsPerMonth: 4,
      nftGatedMembershipEnabled: false,
      nftPremiumUnlockEnabled: false,
      creatorPassEnabled: false,
      achievementBadgesEnabled: false,
      clipNftMarketplaceMode: "SEPARATE_ONLY",
      clipNftOnChainMintEnabled: false,
      nftCollectionMintFeeStars: 50,
      nftItemMintFeeStars: 10,
      nftPlatformFeeBps: 100,
      starsPackageBonusBps: 0,
      starsPackageLabel: null,
      starsCouponEnabled: false,
      starsCouponMinPurchaseStars: 0,
      starsCouponMinDaysSinceSignup: 0,
      starsCouponMinUploads: 0,
      starsCouponMinViews: 0,
      starsCouponMinLikes: 0,
      starsCouponMinComments: 0,
      starsCouponMinWatchMinutes: 0,
      starsCouponMinSubscriptions: 0,
      starsBundleDiscountEnabled: false,
      starsBundleBonusPct: 0,
      starsBundleMinPurchaseStars: 0,
      nftUnverifiedFirstSaleHoldDays: 10,
      nftExportBaseFeeStars: 0,
      nftExportUploadMediaFeePerGbStars: 0,
      nftExportContractChangeDelayHours: 24,
      nftExportMirrorMode: "READ_ONLY",
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }
  return prisma.siteConfig.upsert({
    where: { id: 1 },
    update: {},
    create: {
      customCss: "",
    },
  });
});

export const getHlsConfig = cache(async () => {
  return prisma.hlsConfig.upsert({
    where: { id: 1 },
    update: {},
    create: {
      segmentSeconds: 6,
      packaging: "SINGLE_FILE",
      ladderJson: JSON.stringify([
        { height: 1080, videoKbps: 5000, audioKbps: 128, maxMb: 200 },
        { height: 720, videoKbps: 2800, audioKbps: 128, maxMb: 200 },
        { height: 480, videoKbps: 1400, audioKbps: 96, maxMb: 200 },
        { height: 360, videoKbps: 900, audioKbps: 64, maxMb: 200 }
      ]),
    },
  });
});
