import { getSiteConfig } from "@/lib/siteConfig";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function ThemeManagerPage() {
  const cfg = await getSiteConfig();
  const keys = prisma
    ? await prisma.apiKey.findMany({ orderBy: { createdAt: "desc" }, take: 50 }).catch(() => [])
    : [];

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle>Theme Manager</CardTitle>
              <CardDescription>Quản lý theme preset và theme đang active.</CardDescription>
            </div>
            <Badge variant="secondary">/admin/themes</Badge>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Active theme</CardTitle>
          <CardDescription>ID preset đang active (set trong Admin Config).</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm font-semibold">{(cfg as any).activeThemeId || "None"}</div>
          <div className="mt-2 text-xs text-zinc-500">
            Upload preset ở /admin/config → Theme Builder. Dùng ID để set active.
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Theme presets API</CardTitle>
          <CardDescription>Export/Import theme.json + assets qua API.</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-zinc-600 dark:text-zinc-300">
          <div>List presets: <code>GET /api/admin/theme-presets</code></div>
          <div>Upload preset: <code>POST /api/admin/theme-presets</code></div>
          <div className="mt-2 text-xs text-zinc-500">API trả về JSON id để kích hoạt.</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">API Keys (External)</CardTitle>
          <CardDescription>Quản lý API key để gọi /api/external/* (Bolt/Lovable/Expo).</CardDescription>
        </CardHeader>
          <CardContent className="text-sm text-zinc-600 dark:text-zinc-300 space-y-2">
            <div>Tạo key: <code>POST /api/admin/api-keys</code></div>
            <div>Danh sách: <code>GET /api/admin/api-keys</code></div>
            <div className="text-xs text-zinc-500">
              Scopes mặc định: <code>public/*</code> + <code>me/*</code>. Bật strictScopes để ép scope.
            </div>
            <div className="mt-3 rounded-lg border border-zinc-200/60 dark:border-zinc-800/80 p-3">
              <div className="text-xs uppercase text-zinc-500">Recent keys</div>
              <div className="mt-2 space-y-1 text-xs">
                {keys.length ? (
                  keys.map((k) => (
                    <div key={k.id} className="flex flex-wrap gap-2">
                      <span className="font-medium">{k.name}</span>
                      <span className="text-zinc-500">{k.scopes}</span>
                      <span className="text-zinc-400">{k.strictScopes ? "strict" : "loose"}</span>
                      {k.allowedOrigins ? (
                        <span className="text-zinc-400">allowlist: {k.allowedOrigins}</span>
                      ) : null}
                    </div>
                  ))
                ) : (
                  <div className="text-zinc-500">Chưa có API key.</div>
                )}
              </div>
            </div>
          </CardContent>
      </Card>
    </div>
  );
}
