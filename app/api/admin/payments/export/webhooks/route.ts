import { auth } from "@/lib/auth";
import { requireAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { csvResponse, toCsv } from "@/lib/payments/csv";

function parseDate(s: string | null, fallback: Date) {
  if (!s) return fallback;
  const d = new Date(s);
  return isNaN(d.getTime()) ? fallback : d;
}

export async function GET(req: Request) {
  const session = await auth();
  try {
    requireAdmin(session);
  } catch {
    return Response.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const url = new URL(req.url);
  const provider = (url.searchParams.get("provider") || "").trim();
  const status = (url.searchParams.get("status") || "").trim();
  const chain = (url.searchParams.get("chain") || "").trim();
  const q = (url.searchParams.get("q") || "").trim();
  const from = parseDate(url.searchParams.get("from"), new Date(Date.now() - 24 * 60 * 60 * 1000));
  const to = parseDate(url.searchParams.get("to"), new Date());

  const where: any = { createdAt: { gte: from, lte: to } };
  if (provider) where.provider = provider;
  if (status) where.status = status;
  if (chain) where.chain = chain;
  if (q) {
    where.OR = [
      { depositId: { contains: q } },
      { sha256: { contains: q } },
      { failureReason: { contains: q } },
      { endpoint: { contains: q } },
    ];
  }

  type WebhookAuditRow = Awaited<ReturnType<typeof prisma.webhookAuditLog.findMany>>[number];
  const rows = await prisma.webhookAuditLog.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 50_000,
  });

  const csv = toCsv<WebhookAuditRow>(rows as WebhookAuditRow[], [
    { key: "createdAt", header: "createdAt", value: (r: WebhookAuditRow) => r.createdAt.toISOString() },
    { key: "id", header: "auditId", value: (r: WebhookAuditRow) => r.id },
    { key: "provider", header: "provider", value: (r: WebhookAuditRow) => r.provider },
    { key: "chain", header: "chain", value: (r: WebhookAuditRow) => r.chain || "" },
    { key: "endpoint", header: "endpoint", value: (r: WebhookAuditRow) => r.endpoint },
    { key: "status", header: "status", value: (r: WebhookAuditRow) => r.status },
    { key: "depositId", header: "depositId", value: (r: WebhookAuditRow) => r.depositId || "" },
    { key: "sha256", header: "sha256", value: (r: WebhookAuditRow) => r.sha256 },
    { key: "failureReason", header: "failureReason", value: (r: WebhookAuditRow) => r.failureReason || "" },
  ]);

  return csvResponse(`webhook_logs_${from.toISOString()}_${to.toISOString()}.csv`, csv);
}
