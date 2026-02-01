import { requireApiKey } from "@/lib/externalAuth";
import { prisma } from "@/lib/prisma";
import { normalizeWalletScanChain } from "@/lib/walletScan";

export const runtime = "nodejs";

export async function OPTIONS(req: Request) {
  const key = await requireApiKey(req, ["wallet-scan/read"]);
  if (key instanceof Response) return key;
  return new Response(null, { status: 204, headers: key.cors });
}

export async function GET(req: Request, context: { params: Promise<{ chain: string; address: string }> }) {
  const key = await requireApiKey(req, ["wallet-scan/read"]);
  if (key instanceof Response) return key;

  const { chain, address } = await context.params;
  const chainResult = normalizeWalletScanChain(chain);
  if (chainResult.error || !chainResult.chain) {
    return Response.json({ ok: false, error: "INVALID_CHAIN" }, { status: 400, headers: key.cors });
  }
  if (!address) {
    return Response.json({ ok: false, error: "ADDRESS_REQUIRED" }, { status: 400, headers: key.cors });
  }

  const exports = await prisma.nftExportRequest.findMany({
    where: { chain: chainResult.chain, contractAddress: address },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return Response.json(
    {
      ok: true,
      chain: chainResult.chain,
      contractAddress: address,
      exports,
    },
    { headers: key.cors },
  );
}
