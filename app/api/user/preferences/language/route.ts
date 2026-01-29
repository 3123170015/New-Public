import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isLanguageSupported, normalizeLanguage } from "@/lib/i18nShared";
import { cookies, headers } from "next/headers";

export async function POST(req: Request) {
  const session = await auth();
  const uid = (session?.user as any)?.id as string | undefined;

  const form = await req.formData();
  const rawLang = form.get("lang")?.toString() ?? "";
  if (rawLang && !isLanguageSupported(rawLang)) {
    return new Response("INVALID_LANGUAGE", { status: 400 });
  }

  const lang = normalizeLanguage(rawLang);

  cookies().set("lang", lang, {
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  });

  if (uid && prisma) {
    try {
      await prisma.user.update({ where: { id: uid }, data: { preferredLanguage: lang } });
    } catch {
      // Ignore if user was deleted; cookie still stores preference.
    }
  }

  const referer = headers().get("referer") ?? "/";
  return Response.redirect(referer, 303);
}
