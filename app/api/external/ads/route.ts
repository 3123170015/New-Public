import { prisma } from "@/lib/prisma";
import { isAdAllowedForRequest } from "@/lib/userAgent";
import { getActiveMembershipTier } from "@/lib/membership";
import { getExternalUser, requireApiKey } from "@/lib/externalAuth";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const key = await requireApiKey(req, ["ads/read"]);
  if (key instanceof Response) return key;

  const externalUser = await getExternalUser(req);
  const member = externalUser && prisma
    ? await prisma.user.findUnique({
        where: { id: externalUser.id },
        select: { membershipTier: true, membershipExpiresAt: true },
      })
    : null;

  const mem = {
    membershipTier: member?.membershipTier ?? "NONE",
    membershipExpiresAt: member?.membershipExpiresAt ? new Date(member.membershipExpiresAt) : null,
  };

  const activeTier = getActiveMembershipTier(mem);
  const allowHtmlAds = activeTier === "NONE";

  const { searchParams } = new URL(req.url);
  const scope = (searchParams.get("scope") ?? "FEED").toUpperCase();
  const row = await prisma?.adPlacement.findUnique({ where: { scope } });
  if (!row) return Response.json({ enabled: false, everyN: 0, html: "" }, { headers: key.cors });

  if (!allowHtmlAds) {
    return Response.json({ enabled: false, everyN: row.everyN, html: "" }, { headers: key.cors });
  }

  const allowed = isAdAllowedForRequest(
    {
      enabled: row.enabled,
      showOnDesktop: row.showOnDesktop,
      showOnTablet: row.showOnTablet,
      showOnMobile: row.showOnMobile,
      hideForBots: row.hideForBots,
    },
    req.headers,
  );

  return Response.json({ enabled: allowed, everyN: row.everyN, html: row.html }, { headers: key.cors });
}
