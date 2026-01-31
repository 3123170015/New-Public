# Ops & Deployment Skills

## aaPanel
- Scripts: `scripts/aapanel-install.sh`, `scripts/aapanel-update.sh`, `scripts/aapanel-monitor.sh`.
- Configure CORS/cookie cross-domain in `.env`.

## Monitoring
- `/api/verify` status endpoint checks DB/Redis/worker.
- Telegram alerts cho worker/payment watchers (config trong admin).

## Build/Test
- `npm run lint`, `npm run build`, `npm run test`.
- Nếu thiếu `node_modules`, chạy `npm install` trước.
