import { requireExternalUser } from "@/lib/externalAuth";

export const runtime = "nodejs";

export async function OPTIONS(req: Request) {
  const auth = await requireExternalUser(req, ["live/viewer-stats"]);
  if (auth instanceof Response) return auth;
  return new Response(null, { status: 204, headers: auth.cors });
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireExternalUser(req, ["live/viewer-stats"]);
  if (auth instanceof Response) return auth;
  const { id } = await params;

  return Response.json(
    {
      ok: true,
      streamId: id,
      viewers: 0,
      peakViewers: 0,
      avgWatchSeconds: 0,
    },
    { headers: auth.cors },
  );
}
