import { z } from "zod";
import { prisma } from "@/lib/prisma";
import type { Chain } from "@prisma/client";
import { requireApiKey } from "@/lib/externalAuth";

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

const knownChains: Chain[] = ["SOLANA", "ETHEREUM", "POLYGON", "BSC", "BASE", "TRON"];

type WalletScanUser = {
  id: string;
  username: string | null;
  name: string | null;
  email: string | null;
  starBalance: number;
};

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
  const chain = parsed.data.chain ? parsed.data.chain.toUpperCase() : undefined;
  if (chain && !knownChains.includes(chain)) {
    return Response.json({ ok: false, error: "INVALID_CHAIN" }, { status: 400, headers: key.cors });
  }
  const chainFilter = chain as Chain | undefined;

  let user: WalletScanUser | null = null;
  if (rawUserId) {
    user = await prisma.user.findUnique({
      where: { id: rawUserId },
      select: { id: true, username: true, name: true, email: true, starBalance: true },
    });
  }
  if (!user && username) {
    user = await prisma.user.findFirst({
      where: { username },
      select: { id: true, username: true, name: true, email: true, starBalance: true },
    });
  }
  if (!user && address) {
    const wallet = await prisma.userWallet.findFirst({
      where: { address },
      select: { user: { select: { id: true, username: true, name: true, email: true, starBalance: true } } },
    });
    user = wallet?.user ?? null;
  }
  if (!user && txHash) {
    const deposit = await prisma.starDeposit.findFirst({
      where: { txHash },
      select: { user: { select: { id: true, username: true, name: true, email: true, starBalance: true } } },
    });
    user = deposit?.user ?? null;
  }
  if (!user && contractAddress) {
    const exportReq = await prisma.nftExportRequest.findFirst({
      where: { contractAddress },
      select: { user: { select: { id: true, username: true, name: true, email: true, starBalance: true } } },
    });
    user = exportReq?.user ?? null;
  }

  const userId = user?.id;
  const page = parsed.data.page ?? 1;
  const take = parsed.data.take ?? 40;

  const wallets = await prisma.userWallet.findMany({
    where: {
      ...(userId ? { userId } : {}),
      ...(address ? { address } : {}),
      ...(chainFilter ? { chain: chainFilter } : {}),
    },
    select: {
      id: true,
      chain: true,
      address: true,
      verifiedAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const walletIds = wallets.map((w) => w.id);

  const deposits = await prisma.starDeposit.findMany({
    where: {
      ...(userId ? { userId } : {}),
      ...(txHash ? { txHash } : {}),
      ...(chainFilter ? { chain: chainFilter } : {}),
    },
    include: { token: true },
    orderBy: { createdAt: "desc" },
    take,
    skip: (page - 1) * take,
  });

  const starTx = userId
    ? await prisma.starTransaction.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        take,
        skip: (page - 1) * take,
      })
    : [];

  const nftExports = await prisma.nftExportRequest.findMany({
    where: {
      ...(userId ? { userId } : {}),
      ...(txHash ? { txHash } : {}),
      ...(contractAddress ? { contractAddress } : {}),
      ...(chainFilter ? { chain: chainFilter } : {}),
    },
    orderBy: { createdAt: "desc" },
    take,
    skip: (page - 1) * take,
  });

  const walletAssets = walletIds.length
    ? await prisma.userWalletAsset.findMany({
        where: {
          walletId: { in: walletIds },
          ...(contractAddress ? { assetKey: contractAddress } : {}),
          ...(chainFilter ? { chain: chainFilter } : {}),
        },
        orderBy: { lastSyncAt: "desc" },
        take,
      })
    : [];

  const ledger = [
    ...starTx.map((tx) => ({
      kind: "STAR_TX",
      id: tx.id,
      createdAt: tx.createdAt,
      chain: null,
      token: "STARS",
      amount: tx.delta.toString(),
      status: "SETTLED",
      txHash: null,
      note: tx.note ?? null,
      type: tx.type,
    })),
    ...deposits.map((deposit) => ({
      kind: "DEPOSIT",
      id: deposit.id,
      createdAt: deposit.createdAt,
      chain: deposit.chain,
      token: deposit.token?.symbol ?? null,
      amount: deposit.actualAmount?.toString() ?? deposit.expectedAmount?.toString() ?? null,
      status: deposit.status,
      txHash: deposit.txHash ?? null,
      memo: deposit.memo ?? null,
    })),
    ...nftExports.map((exportReq) => ({
      kind: "NFT_EXPORT",
      id: exportReq.id,
      createdAt: exportReq.createdAt,
      chain: exportReq.chain,
      token: exportReq.contractAddress ?? null,
      amount: null,
      status: exportReq.status,
      txHash: exportReq.txHash ?? null,
      tokenIdHex: exportReq.tokenIdHex ?? null,
    })),
  ].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));

  return Response.json(
    {
      ok: true,
      query: {
        username: username ?? null,
        userId: rawUserId ?? null,
        address: address ?? null,
        txHash: txHash ?? null,
        contractAddress: contractAddress ?? null,
        chain: chain ?? null,
      },
      user,
      wallets,
      ledger,
      deposits,
      starTransactions: starTx,
      nftExports,
      walletAssets,
      payoutLedger: [],
      page,
      take,
    },
    { headers: key.cors },
  );
}
