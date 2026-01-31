import { prisma } from "@/lib/prisma";
import { requireExternalUser } from "@/lib/externalAuth";

export const runtime = "nodejs";

export async function OPTIONS(req: Request) {
  const key = await requireExternalUser(req, ["me/notifications"]);
  if (key instanceof Response) return key;
  return new Response(null, { status: 204, headers: key.cors });
}

export async function GET(req: Request) {
  const result = await requireExternalUser(req, ["me/notifications"]);
  if (result instanceof Response) return result;

  const url = new URL(req.url);
  const takeRaw = Number(url.searchParams.get("take") ?? 50);
  const take = Math.min(200, Math.max(1, Number.isFinite(takeRaw) ? takeRaw : 50));

  const items = await prisma.notification.findMany({
    where: { userId: result.user.id },
    orderBy: { createdAt: "desc" },
    take,
    select: {
      id: true,
      type: true,
      title: true,
      body: true,
      url: true,
      isRead: true,
      createdAt: true,
      actor: { select: { id: true, name: true } },
    },
  });

  type NotificationRow = Awaited<ReturnType<typeof prisma.notification.findMany>>[number] & {
    actor?: { id: string; name: string | null } | null;
  };

  return Response.json(
    {
      ok: true,
      notifications: (items as NotificationRow[]).map((n: NotificationRow) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        body: n.body,
        url: n.url,
        isRead: n.isRead,
        createdAt: n.createdAt.toISOString(),
        actor: n.actor ? { id: n.actor.id, name: n.actor.name } : null,
      })),
    },
    { headers: result.cors },
  );
}
