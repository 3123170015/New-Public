import "server-only";
import { cookies, headers } from "next/headers";
import { auth } from "@/lib/auth";
import {
  DEFAULT_LANGUAGE,
  normalizeLanguage,
  SUPPORTED_LANGUAGES,
  type Language,
  t,
  isLanguageSupported,
} from "@/lib/i18nShared";

export { DEFAULT_LANGUAGE, normalizeLanguage, SUPPORTED_LANGUAGES, t, isLanguageSupported };
export type { Language };

export async function getRequestLanguage(): Promise<Language> {
  const cookieLang = cookies().get("lang")?.value;
  if (cookieLang) return normalizeLanguage(cookieLang);

  if (process.env.AUTH_SECRET && process.env.BUILDING !== "1") {
    try {
      const session = await auth();
      const userLang = (session?.user as any)?.preferredLanguage as string | undefined;
      if (userLang) return normalizeLanguage(userLang);
    } catch {
      // Ignore auth errors and fall back to header/default.
    }
  }
  const headerLang = headers().get("accept-language");
  if (!headerLang) return DEFAULT_LANGUAGE;
  const first = headerLang.split(",")[0];
  return normalizeLanguage(first);
}
