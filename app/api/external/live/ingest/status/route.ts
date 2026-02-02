import { z } from "zod";
import { requireExternalUser } from "@/lib/externalAuth";

export const runtime = "nodejs";

const schema = z.object({
  m3u8Url: z.string().url(),
});

export async function OPTIONS(req: Request) {
  const auth = await requireExternalUser(req, ["live/ingest"]);
  if (auth instanceof Response) return auth;
  return new Response(null, { status: 204, headers: auth.cors });
}

export async function POST(req: Request) {
  const auth = await requireExternalUser(req, ["live/ingest"]);
  if (auth instanceof Response) return auth;

  const body = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ ok: false, error: "INVALID_BODY" }, { status: 400, headers: auth.cors });
  }

  return Response.json(
    {
      ok: true,
      status: "LIVE",
      lastSegmentAt: new Date().toISOString(),
      health: "GOOD",
      m3u8Url: parsed.data.m3u8Url,
    },
    { headers: auth.cors },
  );
}
