import { getSiteConfig } from "@/lib/siteConfig";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function ThemeManagerPage() {
  const cfg = await getSiteConfig();

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
    </div>
  );
}
