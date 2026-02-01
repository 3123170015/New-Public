import { z } from "zod";
import { requireExternalUser } from "@/lib/externalAuth";

export const runtime = "nodejs";

const messageSchema = z.object({
  message: z.string().min(1).max(500),
});

export async function OPTIONS(req: Request) {
  const auth = await requireExternalUser(req, ["live/streams"]);
  if (auth instanceof Response) return auth;
  return new Response(null, { status: 204, headers: auth.cors });
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireExternalUser(req, ["live/streams"]);
  if (auth instanceof Response) return auth;

  return Response.json({ ok: true, items: [], streamId: params.id }, { headers: auth.cors });
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireExternalUser(req, ["live/streams"]);
  if (auth instanceof Response) return auth;

  const body = await req.json().catch(() => null);
  const parsed = messageSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ ok: false, error: "INVALID_BODY" }, { status: 400, headers: auth.cors });
  }

  return Response.json(
    {
      ok: true,
      streamId: params.id,
      message: {
        id: `msg_${Date.now()}`,
        text: parsed.data.message,
        createdAt: new Date().toISOString(),
      },
    },
    { headers: auth.cors },
  );
}
