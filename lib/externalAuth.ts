import crypto from "crypto";
import type { ApiKey, Role, User } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { rateLimit } from "@/lib/rateLimit";
import { getClientIp } from "@/lib/requestIp";

type JwtPayload = {
  sub: string;
  role: Role;
  email?: string | null;
  name?: string | null;
  iat: number;
  exp: number;
  aud: "external";
};

type ExternalUser = {
  id: string;
  role: Role;
  email?: string | null;
  name?: string | null;
};

const JWT_AUD = "external";
const JWT_COOKIE = env.EXTERNAL_JWT_COOKIE_NAME ?? "vs_ext_auth";
const JWT_EXPIRES_MIN = env.EXTERNAL_JWT_EXPIRES_MIN ?? 60 * 24 * 30;

function base64Url(input: Buffer | string) {
  return Buffer.from(input).toString("base64url");
}

function signJwt(payload: Omit<JwtPayload, "iat" | "exp" | "aud">, expiresInMin = JWT_EXPIRES_MIN) {
  const now = Math.floor(Date.now() / 1000);
  const body: JwtPayload = {
    ...payload,
    iat: now,
    exp: now + Math.max(60, Math.floor(expiresInMin * 60)),
    aud: JWT_AUD,
  };
  const header = base64Url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payloadEnc = base64Url(JSON.stringify(body));
  const data = `${header}.${payloadEnc}`;
  const sig = crypto.createHmac("sha256", String(env.AUTH_SECRET || "dev-secret")).update(data).digest("base64url");
  return `${data}.${sig}`;
}

function verifyJwt(token: string): JwtPayload | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [header, payload, signature] = parts;
  const data = `${header}.${payload}`;
  const expected = crypto.createHmac("sha256", String(env.AUTH_SECRET || "dev-secret")).update(data).digest("base64url");
  try {
    const ok = crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
    if (!ok) return null;
  } catch {
    return null;
  }
  try {
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as JwtPayload;
    if (!decoded || decoded.aud !== JWT_AUD) return null;
    if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) return null;
    return decoded;
  } catch {
    return null;
  }
}

export function hashApiKey(raw: string) {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

function parseCsv(raw?: string | null) {
  return String(raw || "")
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function normalizeScope(scope: string) {
  return scope.trim().toLowerCase();
}

function scopeMatches(allowed: string, required: string) {
  if (allowed === "*") return true;
  if (allowed.endsWith("/*")) {
    return required.startsWith(allowed.slice(0, -1));
  }
  return allowed === required;
}

function hasScopes(allowedScopes: string[], requiredScopes: string[]) {
  if (!requiredScopes.length) return true;
  return requiredScopes.every((required) => allowedScopes.some((allowed) => scopeMatches(allowed, required)));
}

function isOriginAllowed(origin: string, allowlist: string[]) {
  if (!allowlist.length) return false;
  let host = "";
  try {
    host = new URL(origin).hostname.toLowerCase();
  } catch {
    return false;
  }
  const originLower = origin.toLowerCase();
  return allowlist.some((entry) => {
    const e = entry.toLowerCase();
    if (e === "*") return true;
    if (e.startsWith("http")) return originLower === e;
    if (e.startsWith("*.")) return host.endsWith(e.slice(1));
    if (e.startsWith(".")) return host.endsWith(e);
    return host === e;
  });
}

export function buildExternalCorsHeaders(req: Request, allowedOrigin?: string | null) {
  const origin = req.headers.get("origin");
  const envAllow = String(env.EXTERNAL_CORS_ALLOW_ORIGIN || "").trim();
  const envAllowList = envAllow ? envAllow.split(",").map((s) => s.trim()).filter(Boolean) : [];
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key",
    "Access-Control-Expose-Headers": "X-RateLimit-Remaining, X-RateLimit-Reset",
  };
  if (origin) {
    const extraAllowed = envAllowList.length ? isOriginAllowed(origin, envAllowList) : false;
    const allowOrigin = allowedOrigin ?? (extraAllowed ? origin : null);
    if (allowOrigin) {
      headers["Access-Control-Allow-Origin"] = allowOrigin;
      headers["Access-Control-Allow-Credentials"] = "true";
      headers["Vary"] = "Origin";
    } else {
      headers["Access-Control-Allow-Origin"] = "null";
    }
  } else {
    headers["Access-Control-Allow-Origin"] = "*";
  }
  return headers;
}

function buildAuthCookie(token: string) {
  const secure = Boolean(env.SITE_URL?.startsWith("https://"));
  const sameSite = secure ? "None" : "Lax";
  const maxAge = Math.max(60, Math.floor(JWT_EXPIRES_MIN * 60));
  return `${JWT_COOKIE}=${token}; Path=/; HttpOnly; SameSite=${sameSite}; Max-Age=${maxAge};${secure ? " Secure;" : ""}`;
}

function clearAuthCookie() {
  const secure = Boolean(env.SITE_URL?.startsWith("https://"));
  const sameSite = secure ? "None" : "Lax";
  return `${JWT_COOKIE}=; Path=/; HttpOnly; SameSite=${sameSite}; Max-Age=0;${secure ? " Secure;" : ""}`;
}

export function issueExternalToken(user: ExternalUser) {
  return signJwt({ sub: user.id, role: user.role, email: user.email ?? null, name: user.name ?? null });
}

export function externalAuthCookie(token: string) {
  return buildAuthCookie(token);
}

export function clearExternalAuthCookie() {
  return clearAuthCookie();
}

function extractBearerToken(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  const parts = auth.split(" ");
  if (parts.length === 2 && parts[0].toLowerCase() === "bearer") return parts[1];
  return null;
}

function extractCookieToken(req: Request) {
  const raw = req.headers.get("cookie") ?? "";
  if (!raw) return null;
  const cookies = raw.split(";").map((c) => c.trim());
  const found = cookies.find((c) => c.startsWith(`${JWT_COOKIE}=`));
  if (!found) return null;
  return decodeURIComponent(found.slice(JWT_COOKIE.length + 1));
}

export async function getExternalUser(req: Request): Promise<ExternalUser | null> {
  const token = extractBearerToken(req) ?? extractCookieToken(req);
  if (!token) return null;
  const payload = verifyJwt(token);
  if (!payload) return null;
  if (!prisma) return { id: payload.sub, role: payload.role, email: payload.email, name: payload.name };
  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: { id: true, role: true, email: true, name: true },
  });
  if (!user) return null;
  return { id: user.id, role: user.role, email: user.email, name: user.name };
}

export async function requireApiKey(req: Request, scopes: string[] = []) {
  if (!prisma) {
    return Response.json({ ok: false, error: "DB_NOT_READY" }, { status: 503, headers: buildExternalCorsHeaders(req) });
  }
  const raw = req.headers.get("x-api-key") ?? "";
  if (!raw) {
    return Response.json({ ok: false, error: "API_KEY_REQUIRED" }, { status: 401, headers: buildExternalCorsHeaders(req) });
  }
  const keyHash = hashApiKey(raw.trim());
  const apiKey = await prisma.apiKey.findUnique({ where: { keyHash } });
  if (!apiKey || !apiKey.isActive) {
    return Response.json({ ok: false, error: "API_KEY_INVALID" }, { status: 401, headers: buildExternalCorsHeaders(req) });
  }
  const origin = req.headers.get("origin");
  if (origin) {
    const allowlist = parseCsv(apiKey.allowedOrigins);
    if (!isOriginAllowed(origin, allowlist)) {
      return Response.json({ ok: false, error: "ORIGIN_NOT_ALLOWED" }, { status: 403, headers: buildExternalCorsHeaders(req, origin) });
    }
  }
  const allowedScopes = parseCsv(apiKey.scopes).map(normalizeScope);
  if (!hasScopes(allowedScopes.length ? allowedScopes : ["*"], scopes.map(normalizeScope))) {
    return Response.json({ ok: false, error: "SCOPE_DENIED" }, { status: 403, headers: buildExternalCorsHeaders(req, origin) });
  }
  const ip = getClientIp(req);
  const windowMs = Math.max(10, apiKey.rateLimitWindowSec || 60) * 1000;
  const limit = Math.max(10, apiKey.rateLimitPerMinute || 600);
  const rl = await rateLimit(`external:${apiKey.id}:${ip}`, limit, windowMs);
  if (!rl.ok) {
    return Response.json(
      { ok: false, error: "RATE_LIMIT" },
      {
        status: 429,
        headers: buildExternalCorsHeaders(req, origin),
      },
    );
  }
  const now = Date.now();
  if (!apiKey.lastUsedAt || now - apiKey.lastUsedAt.getTime() > 60_000) {
    prisma.apiKey.update({ where: { id: apiKey.id }, data: { lastUsedAt: new Date() } }).catch(() => null);
  }
  return { apiKey, cors: buildExternalCorsHeaders(req, origin), rateLimit: rl };
}

export async function requireExternalUser(req: Request, scopes: string[] = []) {
  const apiKeyResult = await requireApiKey(req, scopes);
  if (apiKeyResult instanceof Response) return apiKeyResult;
  const user = await getExternalUser(req);
  if (!user) {
    return Response.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401, headers: apiKeyResult.cors });
  }
  return { ...apiKeyResult, user };
}

export function sanitizeUser(user: User | ExternalUser) {
  return {
    id: user.id,
    email: user.email ?? null,
    name: user.name ?? null,
    role: (user as ExternalUser).role ?? "USER",
  };
}
