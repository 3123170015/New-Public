import { requireExternalUser, sanitizeUser } from "@/lib/externalAuth";

export const runtime = "nodejs";

export async function OPTIONS(req: Request) {
  const key = await requireExternalUser(req, ["auth/me"]);
  if (key instanceof Response) return key;
  return new Response(null, { status: 204, headers: key.cors });
}

export async function GET(req: Request) {
  const result = await requireExternalUser(req, ["auth/me"]);
  if (result instanceof Response) return result;
  return Response.json({ ok: true, user: sanitizeUser(result.user) }, { headers: result.cors });
}
