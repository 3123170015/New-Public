import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireApiKey, getExternalUser } from "@/lib/externalAuth";
import {
  buildWalletScanHits,
  getWalletScanData,
  normalizeWalletScanChain,
  resolveWalletScanUser,
  walletScanChains,
} from "@/lib/walletScan";

export const runtime = "nodejs";

const querySchema = z.object({
  username: z.string().min(1).max(60).optional(),
  userId: z.string().min(1).optional(),
  address: z.string().min(1).max(200).optional(),
  txHash: z.string().min(1).max(200).optional(),
  contractAddress: z.string().min(1).max(200).optional(),
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

  const { username, userId: rawUserId, address, txHash, contractAddress } = parsed.data;
  const rawChain = parsed.data.chain ? parsed.data.chain.toUpperCase() : undefined;
  const chainResult = normalizeWalletScanChain(rawChain);
  if (chainResult.error) {
    return Response.json({ ok: false, error: "INVALID_CHAIN" }, { status: 400, headers: key.cors });
  }
  const chainFilter = chainResult.chain;

  const user = await resolveWalletScanUser({
    userId: rawUserId,
    username,
    address,
    txHash,
    contractAddress,
  });

  const userId = user?.id;
  const page = parsed.data.page ?? 1;
  const take = parsed.data.take ?? 40;
  const includePrivate = url.searchParams.get("includePrivate") === "1";
  const authUser = await getExternalUser(req);
  const canSeePrivate = includePrivate && authUser && (authUser.role === "ADMIN" || authUser.id === userId);

  const data = await getWalletScanData(
    {
      userId: userId ?? undefined,
      username,
      address,
      txHash,
      contractAddress,
      chain: chainFilter,
    },
    {
      page,
      take,
      includeStarLedger: canSeePrivate,
    },
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
        username: username ?? null,
        userId: rawUserId ?? null,
        address: address ?? null,
        txHash: txHash ?? null,
        contractAddress: contractAddress ?? null,
        chain: rawChain ?? null,
        page,
        take,
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
      payoutLedger: canSeePrivate ? data.payoutLedger : [],
      page: data.page,
      take: data.take,
    },
    { headers: key.cors },
  );
}
