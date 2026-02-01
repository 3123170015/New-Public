import { prisma } from "@/lib/prisma";
import { requireApiKey } from "@/lib/externalAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const key = await requireApiKey(req, ["boost/plans"]);
  if (key instanceof Response) return key;
  const list = await prisma?.boostPlan.findMany({
    where: { active: true },
    orderBy: [{ sort: "asc" }, { priceStars: "asc" }],
  });
  return Response.json({ ok: true, plans: list ?? [] }, { headers: key.cors });
}
