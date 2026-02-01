import { requireApiKey } from "@/lib/externalAuth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function OPTIONS(req: Request) {
  const key = await requireApiKey(req, ["wallet-scan/read"]);
  if (key instanceof Response) return key;
  return new Response(null, { status: 204, headers: key.cors });
}

export async function GET(req: Request) {
  const key = await requireApiKey(req, ["wallet-scan/read"]);
  if (key instanceof Response) return key;

  const exports = await prisma.nftExportRequest.findMany({
    select: { chain: true, contractAddress: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const unique = new Map<string, { chain: string; contractAddress: string; latestAt: Date }>();
  exports.forEach((item) => {
    if (!item.contractAddress) return;
    const keyId = `${item.chain}:${item.contractAddress}`;
    const current = unique.get(keyId);
    if (!current || current.latestAt < item.createdAt) {
      unique.set(keyId, { chain: item.chain, contractAddress: item.contractAddress, latestAt: item.createdAt });
    }
  });

  return Response.json(
    {
      ok: true,
      items: Array.from(unique.values()).map((item) => ({
        chain: item.chain,
        contractAddress: item.contractAddress,
        latestAt: item.latestAt,
      })),
    },
    { headers: key.cors },
  );
}
