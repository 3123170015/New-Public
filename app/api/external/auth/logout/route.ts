import { buildExternalCorsHeaders, clearExternalAuthCookie, requireApiKey } from "@/lib/externalAuth";

export const runtime = "nodejs";

export async function OPTIONS(req: Request) {
  return new Response(null, { status: 204, headers: buildExternalCorsHeaders(req) });
}

export async function POST(req: Request) {
  const apiKeyResult = await requireApiKey(req, ["auth/logout"]);
  if (apiKeyResult instanceof Response) return apiKeyResult;
  const headers = new Headers(apiKeyResult.cors);
  headers.append("Set-Cookie", clearExternalAuthCookie());
  return Response.json({ ok: true }, { headers });
}
