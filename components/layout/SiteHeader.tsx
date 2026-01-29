import Link from "next/link";
import { auth } from "@/lib/auth";
import { getSiteConfig } from "@/lib/siteConfig";
import UserMenu from "./UserMenu";
import { getRequestLanguage } from "@/lib/i18n";
import { t } from "@/lib/i18nShared";

export default async function SiteHeader() {
  const session = await auth();
  const role = (session?.user as any)?.role as string | undefined;
  const userId = (session?.user as any)?.id as string | undefined;

  const site = await getSiteConfig();

  const lang = await getRequestLanguage();

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200/70 bg-white/80 backdrop-blur">
      <div className="container flex items-center justify-between gap-3 py-3">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-2 font-extrabold tracking-tight hover:no-underline"
          >
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-zinc-900 text-white">
              ▶
            </span>
            <span>{site.siteName ?? "VideoShare"}</span>
          </Link>

          <nav className="hidden items-center gap-2 md:flex">
            <Link className="btn btn-ghost px-3 py-2" href="/">
              {t(lang, "nav.home")}
            </Link>
            <Link className="btn btn-ghost px-3 py-2" href="/feed">
              {t(lang, "nav.feed")}
            </Link>
            <Link className="btn btn-ghost px-3 py-2" href="/subscriptions">
              {t(lang, "nav.subscriptions")}
            </Link>
            {session?.user ? (
              <>
                <Link className="btn btn-ghost px-3 py-2" href="/history">
                  {t(lang, "nav.history")}
                </Link>
                <Link className="btn btn-ghost px-3 py-2" href="/playlists">
                  {t(lang, "nav.playlists")}
                </Link>
              </>
            ) : null}
            <Link className="btn btn-ghost px-3 py-2" href="/trending">
              {t(lang, "nav.trending")}
            </Link>
            <Link className="btn btn-ghost px-3 py-2" href="/boost">
              {t(lang, "nav.boost")}
            </Link>
            <Link className="btn btn-ghost px-3 py-2" href="/nft">
              {t(lang, "nav.nft")}
            </Link>
            <Link className="btn btn-ghost px-3 py-2" href="/premium">
              {t(lang, "nav.premium")}
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <Link className="btn btn-primary" href="/upload">
            {t(lang, "nav.upload")}
          </Link>

          {session?.user ? (
            <Link className="btn" href="/studio">
              {t(lang, "nav.studio")}
            </Link>
          ) : null}

          {role === "ADMIN" ? (
            <Link className="btn" href="/admin">
              {t(lang, "nav.admin")}
            </Link>
          ) : null}

          {session?.user ? (
            <UserMenu
              name={session.user.name ?? session.user.email ?? "User"}
              userId={userId}
              lang={lang}
            />
          ) : (
            <Link className="btn" href="/login">
              {t(lang, "nav.login")}
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
