import { z } from "zod";
import { requireExternalUser } from "@/lib/externalAuth";

export const runtime = "nodejs";

const reactionSchema = z.object({
  emoji: z.string().min(1),
});

export async function OPTIONS(req: Request) {
  const auth = await requireExternalUser(req, ["live/reactions"]);
  if (auth instanceof Response) return auth;
  return new Response(null, { status: 204, headers: auth.cors });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireExternalUser(req, ["live/reactions"]);
  if (auth instanceof Response) return auth;
  const { id } = await params;

  const body = await req.json().catch(() => null);
  const parsed = reactionSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ ok: false, error: "INVALID_BODY" }, { status: 400, headers: auth.cors });
  }

  return Response.json(
    { ok: true, streamId: id, emoji: parsed.data.emoji, total: 1 },
    { headers: auth.cors },
  );
}
