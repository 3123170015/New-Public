import LanguageSwitchForm from "@/components/settings/LanguageSwitchForm";
import { getRequestLanguage } from "@/lib/i18n";
import { t } from "@/lib/i18nShared";

export default async function SiteFooter() {
  const lang = await getRequestLanguage();
  return (
    <footer className="border-t border-zinc-200/70 bg-white">
      <div className="container py-8">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="small muted">
            © {new Date().getFullYear()} VideoShare — Next.js + Prisma + R2
          </div>
          <div className="row">
            <a className="btn btn-ghost px-3 py-2" href="/sitemap.xml">
              {t(lang, "footer.sitemap")}
            </a>
            <a className="btn btn-ghost px-3 py-2" href="/robots.txt">
              {t(lang, "footer.robots")}
            </a>
            <a className="btn btn-ghost px-3 py-2" href="/llms.txt">
              {t(lang, "footer.llms")}
            </a>
            <LanguageSwitchForm
              lang={lang}
              label={t(lang, "footer.language")}
              submitLabel={t(lang, "actions.apply")}
              size="sm"
              hideLabel
            />
          </div>
        </div>
      </div>
    </footer>
  );
}
