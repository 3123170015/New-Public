import { auth } from "@/lib/auth";
import { requireAdmin } from "@/lib/authz";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import crypto from "crypto";

const createSchema = z.object({
  name: z.string().min(2).max(120),
  description: z.string().max(2000).optional(),
  scopes: z.string().min(1).max(2000),
  strictScopes: z.boolean().optional().default(false),
  allowedOrigins: z.string().optional().default(""),
  rateLimitPerMinute: z.coerce.number().int().min(10).max(60_000).optional().default(600),
  rateLimitWindowSec: z.coerce.number().int().min(10).max(3600).optional().default(60),
  isActive: z.boolean().optional().default(true),
});

function hashApiKey(raw: string) {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

function generateRawKey() {
  return `vs_${crypto.randomBytes(24).toString("hex")}`;
}

export async function GET() {
  const session = await auth();
  try {
    requireAdmin(session);
  } catch {
    return Response.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const keys = await prisma.apiKey.findMany({ orderBy: { createdAt: "desc" }, take: 200 });
  return Response.json({ keys });
}

export async function POST(req: Request) {
  const session = await auth();
  try {
    requireAdmin(session);
  } catch {
    return Response.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "INVALID_BODY", details: parsed.error.flatten() }, { status: 400 });
  }

  const rawKey = generateRawKey();
  const row = await prisma.apiKey.create({
    data: {
      name: parsed.data.name,
      description: parsed.data.description ?? null,
      keyHash: hashApiKey(rawKey),
      scopes: parsed.data.scopes,
      strictScopes: parsed.data.strictScopes ?? false,
      allowedOrigins: parsed.data.allowedOrigins ?? "",
      rateLimitPerMinute: parsed.data.rateLimitPerMinute ?? 600,
      rateLimitWindowSec: parsed.data.rateLimitWindowSec ?? 60,
      isActive: parsed.data.isActive ?? true,
    },
  });

  return Response.json({ ok: true, key: row, rawKey });
}
