import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";
import { flags } from "@/lib/env";
import {
  buildExternalCorsHeaders,
  externalAuthCookie,
  issueExternalToken,
  requireApiKey,
  sanitizeUser,
} from "@/lib/externalAuth";

export const runtime = "nodejs";

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().min(1).max(80).optional(),
});

export async function OPTIONS(req: Request) {
  return new Response(null, { status: 204, headers: buildExternalCorsHeaders(req) });
}

export async function POST(req: Request) {
  const apiKeyResult = await requireApiKey(req, ["auth/register"]);
  if (apiKeyResult instanceof Response) return apiKeyResult;
  if (!flags.allowPublicSignup) {
    return Response.json({ ok: false, error: "PUBLIC_SIGNUP_DISABLED" }, { status: 403, headers: apiKeyResult.cors });
  }
  if (!prisma) {
    return Response.json({ ok: false, error: "DB_NOT_READY" }, { status: 503, headers: apiKeyResult.cors });
  }

  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ ok: false, error: "INVALID_BODY" }, { status: 400, headers: apiKeyResult.cors });
  }

  const email = parsed.data.email.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) {
    return Response.json({ ok: false, error: "EMAIL_EXISTS" }, { status: 409, headers: apiKeyResult.cors });
  }

  const passwordHash = await hash(parsed.data.password, 10);
  const user = await prisma.user.create({
    data: {
      email,
      name: parsed.data.name ?? email.split("@")[0],
      passwordHash,
      preferredLanguage: "vi",
    },
    select: { id: true, email: true, name: true, role: true },
  });

  const token = issueExternalToken({ id: user.id, role: user.role, email: user.email, name: user.name });
  const headers = new Headers(apiKeyResult.cors);
  headers.append("Set-Cookie", externalAuthCookie(token));

  return Response.json({ ok: true, access_token: token, user: sanitizeUser(user) }, { headers });
}
