import { z } from "zod";
import { requireApiKey } from "@/lib/externalAuth";
import { getWalletScanDexSwaps, normalizeWalletScanChain } from "@/lib/walletScan";

export const runtime = "nodejs";

const querySchema = z.object({
  chain: z.string().min(2).max(30).optional(),
  page: z.coerce.number().int().min(1).max(500).optional(),
  take: z.coerce.number().int().min(1).max(100).optional(),
});

export async function OPTIONS(req: Request) {
  const key = await requireApiKey(req, ["wallet-scan/read"]);
  if (key instanceof Response) return key;
  return new Response(null, { status: 204, headers: key.cors });
}

export async function GET(req: Request) {
  const key = await requireApiKey(req, ["wallet-scan/read"]);
  if (key instanceof Response) return key;

  const url = new URL(req.url);
  const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams.entries()));
  if (!parsed.success) {
    return Response.json({ ok: false, error: "INVALID_QUERY" }, { status: 400, headers: key.cors });
  }

  const chainResult = normalizeWalletScanChain(parsed.data.chain);
  if (chainResult.error) {
    return Response.json({ ok: false, error: "INVALID_CHAIN" }, { status: 400, headers: key.cors });
  }

  const swaps = await getWalletScanDexSwaps(
    { chain: chainResult.chain },
    parsed.data.page ?? 1,
    parsed.data.take ?? 40,
  );

  return Response.json(
    {
      ok: true,
      chain: chainResult.chain ?? null,
      swaps,
      page: parsed.data.page ?? 1,
      take: parsed.data.take ?? 40,
    },
    { headers: key.cors },
  );
}
