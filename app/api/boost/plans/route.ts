import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const list = await prisma.boostPlan.findMany({ where: { active: true }, orderBy: [{ sort: "asc" }, { priceStars: "asc" }] });
  return Response.json({ ok: true, plans: list });
}
