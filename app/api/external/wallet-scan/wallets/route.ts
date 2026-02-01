import { z } from "zod";
import { requireApiKey } from "@/lib/externalAuth";
import { getWalletScanWallets, normalizeWalletScanChain, resolveWalletScanUser } from "@/lib/walletScan";

export const runtime = "nodejs";

const querySchema = z.object({
  username: z.string().min(1).max(60).optional(),
  userId: z.string().min(1).optional(),
  address: z.string().min(1).max(200).optional(),
  chain: z.string().min(2).max(30).optional(),
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
  const user = await resolveWalletScanUser({ userId: parsed.data.userId, username: parsed.data.username, address: parsed.data.address });
  const wallets = await getWalletScanWallets({
    userId: user?.id,
    address: parsed.data.address,
    chain: chainResult.chain,
  });
  const safeUser = user ? { ...user, email: null } : null;

  return Response.json(
    {
      ok: true,
      user: safeUser,
      chain: chainResult.chain ?? null,
      wallets,
    },
    { headers: key.cors },
  );
}
