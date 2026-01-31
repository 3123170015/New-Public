import { prisma } from "@/lib/prisma";
import { requireExternalUser } from "@/lib/externalAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function OPTIONS(req: Request) {
  const key = await requireExternalUser(req, ["stars/topup/history", "user/read"]);
  if (key instanceof Response) return key;
  return new Response(null, { status: 204, headers: key.cors });
}

export async function GET(req: Request) {
  const result = await requireExternalUser(req, ["stars/topup/history", "user/read"]);
  if (result instanceof Response) return result;

  type DepositRow = Awaited<ReturnType<typeof prisma.starDeposit.findMany>>[number] & {
    token?: { symbol: string } | null;
    package?: { stars: number } | null;
  };
  const deposits = await prisma.starDeposit.findMany({
    where: { userId: result.user.id },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { token: true, package: true },
  });

  return Response.json(
    {
      ok: true,
      deposits: (deposits as DepositRow[]).map((d: DepositRow) => ({
        id: d.id,
        chain: d.chain,
        assetSymbol: d.token?.symbol || null,
        expectedAmount: d.expectedAmount?.toString() || null,
        actualAmount: d.actualAmount?.toString() || null,
        txHash: d.txHash,
        status: d.status,
        createdAt: d.createdAt,
      })),
    },
    { headers: result.cors }
  );
}
