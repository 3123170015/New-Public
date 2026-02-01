import { z } from "zod";
import { requireApiKey, getExternalUser } from "@/lib/externalAuth";
import { getWalletScanData, normalizeWalletScanChain, resolveWalletScanUser } from "@/lib/walletScan";

export const runtime = "nodejs";

const querySchema = z.object({
  username: z.string().min(1).max(60).optional(),
  userId: z.string().min(1).optional(),
  chain: z.string().min(2).max(30).optional(),
  page: z.coerce.number().int().min(1).max(500).optional(),
  take: z.coerce.number().int().min(1).max(100).optional(),
  includePrivate: z.string().optional(),
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

  const user = await resolveWalletScanUser({ userId: parsed.data.userId, username: parsed.data.username });
  const authUser = await getExternalUser(req);
  const includePrivate = parsed.data.includePrivate === "1";
  const canSeePrivate = includePrivate && authUser && user && (authUser.role === "ADMIN" || authUser.id === user.id);

  const data = await getWalletScanData(
    { userId: user?.id, username: parsed.data.username, chain: chainResult.chain },
    { page: parsed.data.page ?? 1, take: parsed.data.take ?? 40, includeStarLedger: canSeePrivate },
  );
  const safeUser = user ? { ...user, email: canSeePrivate ? user.email : null } : null;

  return Response.json(
    {
      ok: true,
      user: safeUser,
      chain: chainResult.chain ?? null,
      nftTransfers: data.nftTransfers,
      page: data.page,
      take: data.take,
    },
    { headers: key.cors },
  );
}
