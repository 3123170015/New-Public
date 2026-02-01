import type { Chain } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const walletScanChains: Chain[] = ["SOLANA", "ETHEREUM", "POLYGON", "BSC", "BASE", "TRON"];

export type WalletScanUser = {
  id: string;
  username: string | null;
  name: string | null;
  email: string | null;
  starBalance: number;
};

export type WalletScanNftTransfer = {
  id: string;
  itemId: string | null;
  chain: Chain | null;
  fromUserId: string | null;
  toUserId: string | null;
  source: "SALE" | "AUCTION" | "EXPORT";
  priceStars: number | null;
  contractAddress: string | null;
  txHash: string | null;
  createdAt: Date;
};

export type WalletScanDexSwap = {
  id: string;
  chain: Chain;
  txHash: string | null;
  fromAsset: string | null;
  toAsset: string | null;
  amountIn: string | null;
  amountOut: string | null;
  createdAt: Date;
};

export type WalletScanPayoutLedger = {
  id: string;
  chain: Chain | null;
  amount: string | null;
  status: string;
  txHash: string | null;
  createdAt: Date;
};

type WalletScanQuery = {
  username?: string;
  userId?: string;
  address?: string;
  txHash?: string;
  contractAddress?: string;
  chain?: Chain;
};

type WalletScanDataOptions = {
  page: number;
  take: number;
  includeStarLedger: boolean;
  includeNftDetails?: boolean;
  includeAssets?: boolean;
};

export function normalizeWalletScanChain(raw?: string | null) {
  if (!raw) return { chain: undefined as Chain | undefined };
  const chain = raw.toUpperCase() as Chain;
  if (!walletScanChains.includes(chain)) {
    return { chain: undefined, error: "INVALID_CHAIN" as const };
  }
  return { chain };
}

export async function resolveWalletScanUser({
  userId,
  username,
  address,
  txHash,
  contractAddress,
}: WalletScanQuery): Promise<WalletScanUser | null> {
  if (userId) {
    return prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, name: true, email: true, starBalance: true },
    });
  }
  if (username) {
    return prisma.user.findFirst({
      where: { username },
      select: { id: true, username: true, name: true, email: true, starBalance: true },
    });
  }
  if (address) {
    const wallet = await prisma.userWallet.findFirst({
      where: { address },
      select: { user: { select: { id: true, username: true, name: true, email: true, starBalance: true } } },
    });
    return wallet?.user ?? null;
  }
  if (txHash) {
    const deposit = await prisma.starDeposit.findFirst({
      where: { txHash },
      select: { user: { select: { id: true, username: true, name: true, email: true, starBalance: true } } },
    });
    return deposit?.user ?? null;
  }
  if (contractAddress) {
    const exportReq = await prisma.nftExportRequest.findFirst({
      where: { contractAddress },
      select: { user: { select: { id: true, username: true, name: true, email: true, starBalance: true } } },
    });
    return exportReq?.user ?? null;
  }
  return null;
}

export async function getWalletScanWallets({ userId, address, chain }: WalletScanQuery) {
  return prisma.userWallet.findMany({
    where: {
      ...(userId ? { userId } : {}),
      ...(address ? { address } : {}),
      ...(chain ? { chain } : {}),
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
}

export async function getWalletScanDeposits({ userId, txHash, chain }: WalletScanQuery, page: number, take: number) {
  return prisma.starDeposit.findMany({
    where: {
      ...(userId ? { userId } : {}),
      ...(txHash ? { txHash } : {}),
      ...(chain ? { chain } : {}),
    },
    include: { token: true },
    orderBy: { createdAt: "desc" },
    take,
    skip: (page - 1) * take,
  });
}

export async function getWalletScanStarLedger(userId: string | undefined, page: number, take: number) {
  if (!userId) return [];
  return prisma.starTransaction.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take,
    skip: (page - 1) * take,
  });
}

export async function getWalletScanNftExports(
  { userId, txHash, contractAddress, chain }: WalletScanQuery,
  page: number,
  take: number,
) {
  return prisma.nftExportRequest.findMany({
    where: {
      ...(userId ? { userId } : {}),
      ...(txHash ? { txHash } : {}),
      ...(contractAddress ? { contractAddress } : {}),
      ...(chain ? { chain } : {}),
    },
    orderBy: { createdAt: "desc" },
    take,
    skip: (page - 1) * take,
  });
}

export async function getWalletScanNftDetails(userId: string | undefined, exportItemIds: string[], take: number) {
  const nftItemIds = new Set<string>(exportItemIds);
  if (!userId && !exportItemIds.length) {
    return { nftItems: [], nftListings: [], nftAuctions: [], nftSales: [], nftEventLogs: [], nftItemIds: [] as string[] };
  }
  const nftItems = await prisma.nftItem.findMany({
    where: {
      OR: [
        ...(userId ? [{ ownerId: userId }] : []),
        ...(exportItemIds.length ? [{ id: { in: exportItemIds } }] : []),
      ],
    },
    select: {
      id: true,
      name: true,
      ownerId: true,
      collectionId: true,
      exportStatus: true,
      exportChain: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
    take,
  });
  nftItems.forEach((item) => nftItemIds.add(item.id));
  const nftIdList = Array.from(nftItemIds);
  const nftListings = await prisma.nftListing.findMany({
    where: {
      OR: [
        ...(userId ? [{ sellerId: userId }] : []),
        ...(nftIdList.length ? [{ itemId: { in: nftIdList } }] : []),
      ],
    },
    select: {
      id: true,
      itemId: true,
      sellerId: true,
      priceStars: true,
      status: true,
      createdAt: true,
      soldAt: true,
      cancelledAt: true,
    },
    orderBy: { createdAt: "desc" },
    take,
  });
  const nftAuctions = await prisma.nftAuction.findMany({
    where: {
      OR: [
        ...(userId ? [{ sellerId: userId }] : []),
        ...(nftIdList.length ? [{ itemId: { in: nftIdList } }] : []),
      ],
    },
    select: {
      id: true,
      itemId: true,
      sellerId: true,
      startPriceStars: true,
      reservePriceStars: true,
      startAt: true,
      endAt: true,
      status: true,
      highestBidId: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { createdAt: "desc" },
    take,
  });
  const nftSales = await prisma.nftSale.findMany({
    where: {
      OR: [
        ...(userId ? [{ buyerId: userId }, { sellerId: userId }] : []),
        ...(nftIdList.length ? [{ itemId: { in: nftIdList } }] : []),
      ],
    },
    select: {
      id: true,
      itemId: true,
      buyerId: true,
      sellerId: true,
      priceStars: true,
      platformFeeStars: true,
      royaltyStars: true,
      createdAt: true,
      listingId: true,
      auctionId: true,
    },
    orderBy: { createdAt: "desc" },
    take,
  });
  const nftEventLogs = userId
    ? await prisma.nftEventLog.findMany({
        where: { actorId: userId },
        select: { id: true, action: true, dataJson: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take,
      })
    : [];
  return { nftItems, nftListings, nftAuctions, nftSales, nftEventLogs, nftItemIds: nftIdList };
}

export function buildWalletScanNftTransfers(
  nftSales: Array<{
    id: string;
    itemId: string;
    buyerId: string;
    sellerId: string;
    priceStars: number;
    createdAt: Date;
    auctionId: string | null;
  }>,
  nftExports: Array<{
    id: string;
    itemId: string;
    chain: Chain;
    contractAddress: string | null;
    txHash: string | null;
    createdAt: Date;
    userId: string;
  }>,
): WalletScanNftTransfer[] {
  const saleTransfers: WalletScanNftTransfer[] = nftSales.map((sale) => ({
    id: sale.id,
    itemId: sale.itemId,
    chain: null,
    fromUserId: sale.sellerId,
    toUserId: sale.buyerId,
    source: sale.auctionId ? "AUCTION" : "SALE",
    priceStars: Number(sale.priceStars || 0),
    contractAddress: null,
    txHash: null,
    createdAt: sale.createdAt,
  }));
  const exportTransfers: WalletScanNftTransfer[] = nftExports.map((exportReq) => ({
    id: exportReq.id,
    itemId: exportReq.itemId ?? null,
    chain: exportReq.chain,
    fromUserId: exportReq.userId,
    toUserId: null,
    source: "EXPORT",
    priceStars: null,
    contractAddress: exportReq.contractAddress ?? null,
    txHash: exportReq.txHash ?? null,
    createdAt: exportReq.createdAt,
  }));
  return [...saleTransfers, ...exportTransfers].sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
}

export async function getWalletScanDexSwaps(_query: WalletScanQuery, _page: number, _take: number): Promise<WalletScanDexSwap[]> {
  return [];
}

export async function getWalletScanPayoutLedger(_query: WalletScanQuery, _page: number, _take: number): Promise<WalletScanPayoutLedger[]> {
  return [];
}

export async function getWalletScanWalletAssets(walletIds: string[], contractAddress?: string, chain?: Chain, take = 80) {
  if (!walletIds.length) return [];
  return prisma.userWalletAsset.findMany({
    where: {
      walletId: { in: walletIds },
      ...(contractAddress ? { assetKey: contractAddress } : {}),
      ...(chain ? { chain } : {}),
    },
    orderBy: { lastSyncAt: "desc" },
    take,
  });
}

type WalletScanStarTxRow = {
  id: string;
  createdAt: Date;
  delta: number;
  note: string | null;
  type: string;
};

type WalletScanDepositRow = {
  id: string;
  createdAt: Date;
  chain: Chain;
  status: string;
  txHash: string | null;
  memo: string | null;
  actualAmount: number | null;
  expectedAmount: number | null;
  token: { symbol: string | null } | null;
};

type WalletScanExportRow = {
  id: string;
  createdAt: Date;
  chain: Chain;
  status: string;
  txHash: string | null;
  contractAddress: string | null;
  tokenIdHex: string | null;
};

export function buildWalletScanLedger(
  starTx: WalletScanStarTxRow[],
  deposits: WalletScanDepositRow[],
  nftExports: WalletScanExportRow[],
) {
  return [
    ...starTx.map((tx) => ({
      kind: "STAR_TX",
      id: tx.id,
      createdAt: tx.createdAt,
      chain: "OFFCHAIN",
      token: "STARS",
      amount: tx.delta.toString(),
      status: "SETTLED",
      txHash: null,
      memo: tx.note ?? null,
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
}

export function buildWalletScanHits({
  user,
  wallets,
  deposits,
  nftExports,
}: {
  user: WalletScanUser | null;
  wallets: Array<{ id: string; chain: Chain; address: string }>;
  deposits: Array<{ txHash: string | null; chain: Chain; status: string; token?: { symbol?: string | null } | null }>;
  nftExports: Array<{ contractAddress: string | null; chain: Chain }>;
}) {
  const userHits = user
    ? [
        {
          id: user.id,
          username: user.username,
          name: user.name,
          email: user.email,
          starBalance: user.starBalance,
        },
      ]
    : [];
  const addressHits = wallets.map((wallet) => ({
    walletId: wallet.id,
    chain: wallet.chain,
    address: wallet.address,
  }));
  const txHits = deposits
    .filter((deposit) => deposit.txHash)
    .map((deposit) => ({
      txHash: deposit.txHash,
      chain: deposit.chain,
      status: deposit.status,
      token: deposit.token?.symbol ?? null,
    }));
  const contractMap = new Map<string, { chain: Chain; contractAddress: string; count: number }>();
  nftExports.forEach((item) => {
    if (!item.contractAddress) return;
    const key = `${item.chain}:${item.contractAddress}`;
    const current = contractMap.get(key);
    if (current) {
      current.count += 1;
    } else {
      contractMap.set(key, { chain: item.chain, contractAddress: item.contractAddress, count: 1 });
    }
  });
  const contractHits = Array.from(contractMap.values());
  return { userHits, addressHits, txHits, contractHits };
}

export async function getWalletScanData(query: WalletScanQuery, options: WalletScanDataOptions) {
  const wallets = await getWalletScanWallets(query);
  const walletIds = wallets.map((wallet) => wallet.id);
  const deposits = await getWalletScanDeposits(query, options.page, options.take);
  const starLedger = options.includeStarLedger ? await getWalletScanStarLedger(query.userId, options.page, options.take) : [];
  const nftExports = await getWalletScanNftExports(query, options.page, options.take);
  const exportItemIds = nftExports.map((item) => item.itemId);
  const nftDetails = options.includeNftDetails === false
    ? { nftItems: [], nftListings: [], nftAuctions: [], nftSales: [], nftEventLogs: [], nftItemIds: [] as string[] }
    : await getWalletScanNftDetails(query.userId, exportItemIds, options.take);
  const nftTransfers = buildWalletScanNftTransfers(
    nftDetails.nftSales.map((sale) => ({
      id: sale.id,
      itemId: sale.itemId,
      buyerId: sale.buyerId,
      sellerId: sale.sellerId,
      priceStars: sale.priceStars,
      createdAt: sale.createdAt,
      auctionId: sale.auctionId ?? null,
    })),
    nftExports.map((exp) => ({
      id: exp.id,
      itemId: exp.itemId,
      chain: exp.chain,
      contractAddress: exp.contractAddress ?? null,
      txHash: exp.txHash ?? null,
      createdAt: exp.createdAt,
      userId: exp.userId,
    })),
  );
  const walletAssets = options.includeAssets === false
    ? []
    : await getWalletScanWalletAssets(walletIds, query.contractAddress, query.chain, options.take);
  const dexSwaps = await getWalletScanDexSwaps(query, options.page, options.take);
  const payoutLedger = await getWalletScanPayoutLedger(query, options.page, options.take);
  const ledger = buildWalletScanLedger(starLedger, deposits, nftExports);
  return {
    wallets,
    deposits,
    starTransactions: starLedger,
    nftExports,
    nftItems: nftDetails.nftItems,
    nftListings: nftDetails.nftListings,
    nftAuctions: nftDetails.nftAuctions,
    nftSales: nftDetails.nftSales,
    nftEventLogs: nftDetails.nftEventLogs,
    nftTransfers,
    dexSwaps,
    walletAssets,
    payoutLedger,
    ledger,
    page: options.page,
    take: options.take,
  };
}
