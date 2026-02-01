import { z } from "zod";
import { requireExternalUser } from "@/lib/externalAuth";
import { claimReferralCode } from "@/lib/referrals";

export const runtime = "nodejs";

const bodySchema = z.object({
  code: z.string().min(3),
});

export async function OPTIONS(req: Request) {
  const auth = await requireExternalUser(req, ["referrals/claim"]);
  if (auth instanceof Response) return auth;
  return new Response(null, { status: 204, headers: auth.cors });
}

export async function POST(req: Request) {
  const auth = await requireExternalUser(req, ["referrals/claim"]);
  if (auth instanceof Response) return auth;

  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ ok: false, error: "INVALID_BODY" }, { status: 400, headers: auth.cors });
  }

  try {
    const result = await claimReferralCode(auth.user.id, parsed.data.code);
    return Response.json({ ok: true, ...result }, { headers: auth.cors });
  } catch (error: any) {
    return Response.json({ ok: false, error: error?.message ?? "CLAIM_FAILED" }, { status: 400, headers: auth.cors });
  }
}
