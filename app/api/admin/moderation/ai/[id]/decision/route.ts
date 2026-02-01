import { z } from "zod";
import { auth } from "@/lib/auth";
import { requireAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const bodySchema = z.object({
  action: z.enum(["APPROVE", "REJECT"]),
  note: z.string().optional(),
});

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  requireAdmin(session);

  if (!prisma) return Response.json({ ok: false, error: "DB_NOT_READY" }, { status: 503 });

  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ ok: false, error: "INVALID_BODY" }, { status: 400 });
  }

  const report = await prisma.videoReport.update({
    where: { id: params.id },
    data: {
      status: parsed.data.action === "APPROVE" ? "RESOLVED" : "REJECTED",
      reviewerId: (session?.user as any)?.id ?? null,
      reviewedAt: new Date(),
    },
    select: { id: true, status: true },
  });

  await prisma.moderationAction.create({
    data: {
      actorUserId: (session?.user as any)?.id,
      targetType: "VIDEO_REPORT",
      targetId: report.id,
      action: parsed.data.action,
      reason: parsed.data.note ?? null,
    },
  });

  return Response.json({ ok: true, report });
}
