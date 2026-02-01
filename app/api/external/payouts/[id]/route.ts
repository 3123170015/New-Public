import { requireExternalUser } from "@/lib/externalAuth";

export const runtime = "nodejs";

export async function OPTIONS(req: Request) {
  const auth = await requireExternalUser(req, ["payouts/read"]);
  if (auth instanceof Response) return auth;
  return new Response(null, { status: 204, headers: auth.cors });
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const auth = await requireExternalUser(req, ["payouts/read"]);
  if (auth instanceof Response) return auth;

  return Response.json(
    {
      ok: true,
      payout: {
        id: params.id,
        status: "PENDING",
        amount: 0,
        methodId: "bank_transfer",
        createdAt: new Date().toISOString(),
      },
    },
    { headers: auth.cors },
  );
}
