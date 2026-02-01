import { z } from "zod";
import { requireApiKey, getExternalUser } from "@/lib/externalAuth";
import {
  buildWalletScanHits,
  getWalletScanData,
  normalizeWalletScanChain,
  resolveWalletScanUser,
} from "@/lib/walletScan";

export const runtime = "nodejs";

const querySchema = z.object({
  chain: z.string().min(2).max(30).optional(),
  includePrivate: z.string().optional(),
  page: z.coerce.number().int().min(1).max(500).optional(),
  take: z.coerce.number().int().min(1).max(100).optional(),
});

export async function OPTIONS(req: Request) {
  const key = await requireApiKey(req, ["wallet-scan/read"]);
  if (key instanceof Response) return key;
  return new Response(null, { status: 204, headers: key.cors });
}

export async function GET(req: Request, context: { params: Promise<{ username: string }> }) {
  const key = await requireApiKey(req, ["wallet-scan/read"]);
  if (key instanceof Response) return key;

  const { username } = await context.params;
  if (!username) {
    return Response.json({ ok: false, error: "USERNAME_REQUIRED" }, { status: 400, headers: key.cors });
  }

  const url = new URL(req.url);
  const parsed = querySchema.safeParse(Object.fromEntries(url.searchParams.entries()));
  if (!parsed.success) {
    return Response.json({ ok: false, error: "INVALID_QUERY" }, { status: 400, headers: key.cors });
  }

  const chainResult = normalizeWalletScanChain(parsed.data.chain);
  if (chainResult.error) {
    return Response.json({ ok: false, error: "INVALID_CHAIN" }, { status: 400, headers: key.cors });
  }

  const user = await resolveWalletScanUser({ username });
  const page = parsed.data.page ?? 1;
  const take = parsed.data.take ?? 40;
  const authUser = await getExternalUser(req);
  const includePrivate = parsed.data.includePrivate === "1";
  const canSeePrivate = includePrivate && authUser && user && (authUser.role === "ADMIN" || authUser.id === user.id);

  const data = await getWalletScanData(
    { username, userId: user?.id, chain: chainResult.chain },
    { page, take, includeStarLedger: canSeePrivate },
  );
  const safeUser = user ? { ...user, email: canSeePrivate ? user.email : null } : null;
  const hits = buildWalletScanHits({
    user: safeUser,
    wallets: data.wallets.map((wallet) => ({ id: wallet.id, chain: wallet.chain, address: wallet.address })),
    deposits: data.deposits.map((deposit) => ({
      txHash: deposit.txHash ?? null,
      chain: deposit.chain,
      status: deposit.status,
      token: deposit.token ? { symbol: deposit.token.symbol } : null,
    })),
    nftExports: data.nftExports.map((item) => ({ contractAddress: item.contractAddress ?? null, chain: item.chain })),
  });

  return Response.json(
    {
      ok: true,
      query: {
        username,
        chain: chainResult.chain ?? null,
        includePrivate,
      },
      hits,
      user: safeUser,
      wallets: data.wallets,
      ledger: data.ledger,
      deposits: data.deposits,
      starTransactions: canSeePrivate ? data.starTransactions : [],
      nftItems: data.nftItems,
      nftListings: data.nftListings,
      nftAuctions: data.nftAuctions,
      nftSales: data.nftSales,
      nftEventLogs: data.nftEventLogs,
      nftTransfers: data.nftTransfers,
      dexSwaps: data.dexSwaps,
      nftExports: data.nftExports,
      walletAssets: data.walletAssets,
      payoutLedger: data.payoutLedger,
      page,
      take,
    },
    { headers: key.cors },
  );
}
