import { z } from "zod";
import { requireExternalUser } from "@/lib/externalAuth";

export const runtime = "nodejs";

const bodySchema = z.object({
  amount: z.number().positive(),
  methodId: z.string().min(1),
  note: z.string().optional(),
});

export async function OPTIONS(req: Request) {
  const auth = await requireExternalUser(req, ["payouts/request"]);
  if (auth instanceof Response) return auth;
  return new Response(null, { status: 204, headers: auth.cors });
}

export async function POST(req: Request) {
  const auth = await requireExternalUser(req, ["payouts/request"]);
  if (auth instanceof Response) return auth;

  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ ok: false, error: "INVALID_BODY" }, { status: 400, headers: auth.cors });
  }

  return Response.json(
    {
      ok: true,
      payout: {
        id: `po_${Date.now()}`,
        status: "PENDING",
        amount: parsed.data.amount,
        methodId: parsed.data.methodId,
        note: parsed.data.note ?? null,
        createdAt: new Date().toISOString(),
      },
    },
    { headers: auth.cors },
  );
}
