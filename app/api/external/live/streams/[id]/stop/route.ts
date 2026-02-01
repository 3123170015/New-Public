import { requireExternalUser } from "@/lib/externalAuth";

export const runtime = "nodejs";

export async function OPTIONS(req: Request) {
  const auth = await requireExternalUser(req, ["live/streams"]);
  if (auth instanceof Response) return auth;
  return new Response(null, { status: 204, headers: auth.cors });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireExternalUser(req, ["live/streams"]);
  if (auth instanceof Response) return auth;
  const { id } = await params;

  return Response.json(
    { ok: true, streamId: id, status: "ENDED" },
    { headers: auth.cors },
  );
}
