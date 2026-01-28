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
  const q = (url.searchParams.get("q") || "").trim();
  const chain = (url.searchParams.get("chain") || "").trim();
  const status = (url.searchParams.get("status") || "").trim();
  const asset = (url.searchParams.get("asset") || "").trim().toUpperCase();
  const from = parseDate(url.searchParams.get("from"), new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
  const to = parseDate(url.searchParams.get("to"), new Date());

  const where: any = { createdAt: { gte: from, lte: to } };
  if (chain) where.chain = chain;
  if (status) where.status = status;
  if (asset) where.token = { symbol: asset };
  if (q) {
    where.OR = [
      { id: { contains: q } },
      { txHash: { contains: q } },
      { failureReason: { contains: q } },
      { memo: { contains: q } },
      { user: { email: { contains: q } } },
    ];
  }

  // hard cap for safety
  type DepositExportRow = Awaited<ReturnType<typeof prisma.starDeposit.findMany>>[number];
  const rows = await prisma.starDeposit.findMany({
    where,
    include: { user: true, token: true, package: true, custodialAddress: true },
    orderBy: { createdAt: "desc" },
    take: 50_000,
  });

  const csv = toCsv<DepositExportRow>(rows as DepositExportRow[], [
    { key: "createdAt", header: "createdAt", value: (r: DepositExportRow) => r.createdAt.toISOString() },
    { key: "id", header: "depositId", value: (r: DepositExportRow) => r.id },
    { key: "chain", header: "chain", value: (r: DepositExportRow) => r.chain },
    { key: "asset", header: "asset", value: (r: DepositExportRow) => r.token?.symbol || "" },
    { key: "status", header: "status", value: (r: DepositExportRow) => r.status },
    { key: "provider", header: "provider", value: (r: DepositExportRow) => r.provider || "" },
    { key: "user", header: "userEmail", value: (r: DepositExportRow) => r.user?.email || "" },
    { key: "expectedAmount", header: "expectedAmount", value: (r: DepositExportRow) => r.expectedAmount?.toString?.() ?? String(r.expectedAmount ?? "") },
    { key: "actualAmount", header: "actualAmount", value: (r: DepositExportRow) => r.actualAmount?.toString?.() ?? String(r.actualAmount ?? "") },
    { key: "stars", header: "stars", value: (r: DepositExportRow) => r.package?.stars ?? 0 },
    { key: "txHash", header: "txHash", value: (r: DepositExportRow) => r.txHash || "" },
    { key: "memo", header: "memo", value: (r: DepositExportRow) => r.memo || "" },
    { key: "custodial", header: "custodialAddress", value: (r: DepositExportRow) => r.custodialAddress?.address || "" },
    { key: "failureReason", header: "failureReason", value: (r: DepositExportRow) => r.failureReason || "" },
    { key: "updatedAt", header: "updatedAt", value: (r: DepositExportRow) => r.updatedAt.toISOString() },
  ]);

  return csvResponse(`deposits_${from.toISOString()}_${to.toISOString()}.csv`, csv);
}
