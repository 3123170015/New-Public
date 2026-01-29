import type { Metadata } from "next";
import "./globals.css";
import { env, flags, isConfiguredEnv } from "@/lib/env";
import { getRequestLanguage } from "@/lib/i18n";
import SiteHeader from "@/components/layout/SiteHeader";
import SiteFooter from "@/components/layout/SiteFooter";
import GlobalBannerAds from "@/components/ads/GlobalBannerAds";
import PwaRegister from "@/components/pwa/PwaRegister";

export async function generateMetadata(): Promise<Metadata> {
  if (!isConfiguredEnv()) {
    return {
      title: "Install • VideoShare",
      description: "Thiết lập hệ thống lần đầu",
      icons: [{ rel: "icon", url: "/icon.svg" }],
    };
  }

  const { getSiteConfig } = await import("@/lib/siteConfig");
  const cfg = await getSiteConfig();

  const base = env.SITE_URL ? new URL(env.SITE_URL) : undefined;

  return {
    title: cfg.siteName,
    description: cfg.defaultDescription,
    manifest: "/manifest.json",
    icons: [{ rel: "icon", url: "/icon.svg" }],
    verification: cfg.googleVerification ? { google: cfg.googleVerification } : undefined,
    metadataBase: base,
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const configured = isConfiguredEnv();

  const lang = await getRequestLanguage();

  if (!configured) {
    return (
      <html lang={lang}>
        <body>
          <div className="container py-6">
            <div className="card mb-4">
              <div className="text-lg font-extrabold">VideoShare</div>
              <div className="small muted mt-1">
                Hệ thống chưa cấu hình môi trường — hãy chạy Install Wizard.
              </div>
            </div>
            {children}
          </div>
        </body>
      </html>
    );
  }


  const { getSiteConfig } = await import("@/lib/siteConfig");
  const OneSignalInit = (await import("@/components/push/OneSignalInit")).default;
  const cfg = await getSiteConfig();
  const customCss = typeof (cfg as any).customCss === "string" ? (cfg as any).customCss : "";

  return (
    <html lang={lang}>
      <body>
        {flags.oneSignal ? (
          <OneSignalInit
            enabled
            appId={cfg.oneSignalAppId || ""}
            safariWebId={cfg.oneSignalSafariWebId || ""}
          />
        ) : null}

        <PwaRegister />

        <div className="min-h-screen bg-zinc-50">
          <style>{`
            .tiktok-scroll::-webkit-scrollbar { display: none; }
          `}</style>
          {/* Header */}
          <SiteHeader />
          <GlobalBannerAds scope="GLOBAL_TOP" />

          {/* Page content */}
          <main className="container py-6">{children}</main>

          {/* Footer */}
          <GlobalBannerAds scope="GLOBAL_BOTTOM" />
          <SiteFooter />
        </div>
        {customCss ? <style data-custom-css>{customCss}</style> : null}
      </body>
    </html>
  );
}
