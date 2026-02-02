import { z } from "zod";
import { requireExternalUser } from "@/lib/externalAuth";

export const runtime = "nodejs";

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  scheduledAt: z.string().datetime().optional(),
  description: z.string().optional(),
  status: z.enum(["SCHEDULED", "CANCELLED", "LIVE"]).optional(),
});

export async function OPTIONS(req: Request) {
  const auth = await requireExternalUser(req, ["live/schedules"]);
  if (auth instanceof Response) return auth;
  return new Response(null, { status: 204, headers: auth.cors });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireExternalUser(req, ["live/schedules"]);
  if (auth instanceof Response) return auth;
  const { id } = await params;

  const body = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ ok: false, error: "INVALID_BODY" }, { status: 400, headers: auth.cors });
  }

  return Response.json(
    {
      ok: true,
      schedule: {
        id,
        ...parsed.data,
      },
    },
    { headers: auth.cors },
  );
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireExternalUser(req, ["live/schedules"]);
  if (auth instanceof Response) return auth;
  const { id } = await params;

  return Response.json({ ok: true, scheduleId: id, status: "CANCELLED" }, { headers: auth.cors });
}
