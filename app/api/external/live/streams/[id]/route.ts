import { requireExternalUser } from "@/lib/externalAuth";

export const runtime = "nodejs";

export async function OPTIONS(req: Request) {
  const auth = await requireExternalUser(req, ["live/streams"]);
  if (auth instanceof Response) return auth;
  return new Response(null, { status: 204, headers: auth.cors });
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireExternalUser(req, ["live/streams"]);
  if (auth instanceof Response) return auth;

  return Response.json(
    {
      ok: true,
      stream: {
        id: params.id,
        status: "LIVE",
        viewerCount: 0,
      },
    },
    { headers: auth.cors },
  );
}
