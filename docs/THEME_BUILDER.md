# Theme Builder (Preset-based)

Hệ thống hỗ trợ upload theme preset (theme.json + assets) để tuỳ biến giao diện mà **không** phải deploy code.

## 1. Theme JSON

File `theme.json` chỉ chứa key/value dạng string. Các key sẽ map vào CSS variables:

```json
{
  "theme-primary": "#111827",
  "theme-primary-foreground": "#ffffff",
  "theme-background": "#fafafa",
  "theme-foreground": "#0f172a",
  "theme-card": "#ffffff",
  "theme-border": "#e5e7eb"
}
```

## 2. Upload preset

Vào **Admin → Config → Theme Builder**, upload:

- `theme.json`
- Logo/background assets (optional)

API sẽ trả JSON `{ "id": "presetId" }`. Copy ID để set `Active Theme` trong Admin Config.

## 3. Active theme

Active preset được lưu trong `SiteConfig.activeThemeId`. Theme active sẽ inject CSS variables từ `theme.json` vào layout và áp dụng toàn site.

## 4. API

- `POST /api/admin/theme-presets` (multipart/form-data)
  - `name`, `description`
  - `themeJson` (file)
  - `logoFile`, `backgroundFile` (optional)
- `GET /api/admin/theme-presets` → list presets

## 5. Checklist tính năng

- Theme Manager UI: `/admin/themes`
- Tạo theme mới: Upload preset + assets
- Preview theme: set `Active Theme` và refresh
- Publish theme (set active): `activeThemeId` trong Admin Config
- Export/Import theme: dùng API GET/POST (JSON + assets)
- Runtime switching: đổi `activeThemeId`
- Theme active lưu DB: `SiteConfig.activeThemeId`
- SSR đọc theme → inject CSS variables trong `app/layout.tsx`
