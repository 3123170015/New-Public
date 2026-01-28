import { handlers } from "@/lib/auth";

export const GET = handlers?.GET ?? (() => new Response("Auth not configured", { status: 501 }));
export const POST = handlers?.POST ?? (() => new Response("Auth not configured", { status: 501 }));
