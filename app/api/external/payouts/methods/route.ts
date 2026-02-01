import { requireExternalUser } from "@/lib/externalAuth";

export const runtime = "nodejs";

export async function OPTIONS(req: Request) {
  const auth = await requireExternalUser(req, ["payouts/methods"]);
  if (auth instanceof Response) return auth;
  return new Response(null, { status: 204, headers: auth.cors });
}

export async function GET(req: Request) {
  const auth = await requireExternalUser(req, ["payouts/methods"]);
  if (auth instanceof Response) return auth;

  return Response.json(
    {
      ok: true,
      items: [
        { id: "bank_transfer", label: "Chuyển khoản ngân hàng", currency: "VND" },
        { id: "usdt_trc20", label: "USDT TRC20", currency: "USDT" },
      ],
    },
    { headers: auth.cors },
  );
}
