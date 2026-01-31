import type { MetadataRoute } from "next";
import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = env.SITE_URL ?? "http://localhost:3000";
  if (!process.env.DATABASE_URL) {
    return [
      { url: base, lastModified: new Date() },
      { url: `${base}/feed`, lastModified: new Date() },
    ];
  }
  type SitemapVideoRow = Awaited<ReturnType<typeof prisma.video.findMany>>[number];
  const videos = prisma
    ? await prisma.video.findMany({
        where: { status: "PUBLISHED", access: "PUBLIC" },
        select: { id: true, updatedAt: true },
        orderBy: { updatedAt: "desc" },
        take: 5000,
      })
    : [];

  return [
    { url: base, lastModified: new Date() },
    { url: `${base}/feed`, lastModified: new Date() },
    ...(videos as SitemapVideoRow[]).map((v: SitemapVideoRow) => ({ url: `${base}/v/${v.id}`, lastModified: v.updatedAt })),
  ];
}
