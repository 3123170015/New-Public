import { cookies } from "next/headers";

export async function POST(req: Request) {
  const store = cookies();
  const current = store.get("theme")?.value;
  const next = current === "dark" ? "light" : "dark";
  store.set("theme", next, { path: "/", maxAge: 60 * 60 * 24 * 365 });
  const referer = req.headers.get("referer") ?? "/";
  return Response.redirect(referer, 303);
}
