import { z } from "zod";
import { requireExternalUser } from "@/lib/externalAuth";

export const runtime = "nodejs";

const createSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
});

export async function OPTIONS(req: Request) {
  const auth = await requireExternalUser(req, ["live/streams"]);
  if (auth instanceof Response) return auth;
  return new Response(null, { status: 204, headers: auth.cors });
}

export async function GET(req: Request) {
  const auth = await requireExternalUser(req, ["live/streams"]);
  if (auth instanceof Response) return auth;

  return Response.json(
    {
      ok: true,
      items: [],
    },
    { headers: auth.cors },
  );
}

export async function POST(req: Request) {
  const auth = await requireExternalUser(req, ["live/streams"]);
  if (auth instanceof Response) return auth;

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ ok: false, error: "INVALID_BODY" }, { status: 400, headers: auth.cors });
  }

  return Response.json(
    {
      ok: true,
      stream: {
        id: `live_${Date.now()}`,
        title: parsed.data.title,
        description: parsed.data.description ?? null,
        status: "READY",
        ingestUrl: "rtmp://stream.example.com/live",
        streamKey: "demo_stream_key",
      },
    },
    { headers: auth.cors },
  );
}
