import { auth } from "@/lib/auth";
import { requireAdmin } from "@/lib/authz";

export const runtime = "nodejs";

export async function GET() {
  const session = await auth();
  requireAdmin(session);

  return Response.json({
    ok: true,
    model: {
      id: "moderation-v1",
      status: "READY",
      lastSyncAt: new Date().toISOString(),
    },
  });
}
