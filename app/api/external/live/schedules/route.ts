import { z } from "zod";
import { requireExternalUser } from "@/lib/externalAuth";

export const runtime = "nodejs";

const scheduleSchema = z.object({
  title: z.string().min(1),
  scheduledAt: z.string().datetime(),
  description: z.string().optional(),
});

export async function OPTIONS(req: Request) {
  const auth = await requireExternalUser(req, ["live/schedules"]);
  if (auth instanceof Response) return auth;
  return new Response(null, { status: 204, headers: auth.cors });
}

export async function GET(req: Request) {
  const auth = await requireExternalUser(req, ["live/schedules"]);
  if (auth instanceof Response) return auth;

  return Response.json({ ok: true, items: [] }, { headers: auth.cors });
}

export async function POST(req: Request) {
  const auth = await requireExternalUser(req, ["live/schedules"]);
  if (auth instanceof Response) return auth;

  const body = await req.json().catch(() => null);
  const parsed = scheduleSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ ok: false, error: "INVALID_BODY" }, { status: 400, headers: auth.cors });
  }

  return Response.json(
    {
      ok: true,
      schedule: {
        id: `schedule_${Date.now()}`,
        title: parsed.data.title,
        scheduledAt: parsed.data.scheduledAt,
        description: parsed.data.description ?? null,
        status: "SCHEDULED",
      },
    },
    { headers: auth.cors },
  );
}
