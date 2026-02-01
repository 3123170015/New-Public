import { auth } from "@/lib/auth";
import { requireAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  const session = await auth();
  requireAdmin(session);

  if (!prisma) return Response.json({ ok: false, error: "DB_NOT_READY" }, { status: 503 });

  const reports = await prisma.videoReport.findMany({
    where: { status: "OPEN" },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      reason: true,
      details: true,
      status: true,
      createdAt: true,
      video: { select: { id: true, title: true } },
    },
  });

  return Response.json({ ok: true, items: reports });
}
