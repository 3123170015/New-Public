import { env } from "@/lib/env";
import { requireExternalUser } from "@/lib/externalAuth";
import { ensureReferralCode } from "@/lib/referrals";

export const runtime = "nodejs";

export async function OPTIONS(req: Request) {
  const auth = await requireExternalUser(req, ["referrals/me"]);
  if (auth instanceof Response) return auth;
  return new Response(null, { status: 204, headers: auth.cors });
}

export async function GET(req: Request) {
  const auth = await requireExternalUser(req, ["referrals/me"]);
  if (auth instanceof Response) return auth;

  const code = await ensureReferralCode(auth.user.id);
  const baseUrl = env.SITE_URL || env.NEXTAUTH_URL || "";
  const shareUrl = baseUrl ? `${baseUrl}/?ref=${encodeURIComponent(code)}` : `/?ref=${encodeURIComponent(code)}`;

  return Response.json(
    { ok: true, code, shareUrl },
    { headers: auth.cors },
  );
}
