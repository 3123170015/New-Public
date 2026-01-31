# Frontend Skills

## UI Stack
- Tailwind CSS + shadcn/ui (Button/Input/Dialog/Sheet/Toast).
- Dark/Light theme: `next-themes` (enabled when configured in the app layout).
- Theme tokens inject từ `SiteConfig` + theme presets.

## Pages chính
- Home: YouTube-style sections (Trending → Feed → Boosted → Continue → Community → Recent).
- Feed: TikTok vertical feed.
- NFT Market: marketplace layout + filters.

## i18n
- Dictionary trong `lib/i18nShared.ts`.
- Language switcher ở footer + member settings.

## External Frontend
Connect the backend via `frontend-api.txt` (root-level API guide):
- X-API-Key + JWT Bearer/cookie.
- CORS allowlist theo `ApiKey.allowedOrigins`.
