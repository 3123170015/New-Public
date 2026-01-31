import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { compare } from "bcryptjs";
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
});

export async function OPTIONS(req: Request) {
  return new Response(null, { status: 204, headers: buildExternalCorsHeaders(req) });
}

export async function POST(req: Request) {
  const apiKeyResult = await requireApiKey(req, ["auth/login"]);
  if (apiKeyResult instanceof Response) return apiKeyResult;
  if (!prisma) {
    return Response.json({ ok: false, error: "DB_NOT_READY" }, { status: 503, headers: apiKeyResult.cors });
  }

  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ ok: false, error: "INVALID_BODY" }, { status: 400, headers: apiKeyResult.cors });
  }

  const email = parsed.data.email.toLowerCase();
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true, name: true, role: true, passwordHash: true },
  });
  if (!user?.passwordHash) {
    return Response.json({ ok: false, error: "INVALID_CREDENTIALS" }, { status: 401, headers: apiKeyResult.cors });
  }
  const ok = await compare(parsed.data.password, user.passwordHash);
  if (!ok) {
    return Response.json({ ok: false, error: "INVALID_CREDENTIALS" }, { status: 401, headers: apiKeyResult.cors });
  }

  const token = issueExternalToken({ id: user.id, role: user.role, email: user.email, name: user.name });
  const headers = new Headers(apiKeyResult.cors);
  headers.append("Set-Cookie", externalAuthCookie(token));

  return Response.json(
    { ok: true, access_token: token, user: sanitizeUser(user) },
    { headers },
  );
}
