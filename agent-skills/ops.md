# Ops & Deployment Skills

## aaPanel
- Script: `scripts/aapanel-install.sh`, `scripts/aapanel-update.sh`, `scripts/aapanel-monitor.sh`.
- Config CORS/cookie cross-domain trong `.env`.

## Monitoring
- /verify status endpoint để kiểm tra DB/Redis/worker.
- Telegram alerts cho worker/payment watchers (config trong admin).

## Build/Test
- `npm run lint`, `npm run build`, `npm run test`.
- Nếu thiếu `node_modules`, chạy `npm install` trước.
