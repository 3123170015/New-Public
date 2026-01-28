# aaPanel Deploy Checklist (Ubuntu 24.04 + aaPanel Stable 7.x)

> Mục tiêu: deploy **Next.js web** + **Worker (BullMQ)** + **MySQL** + **Redis** chạy ổn định, có rollback, và không phá contracts.

## 0) Chuẩn bị VPS / aaPanel
- Ubuntu 24.04.3 LTS x86_64
- aaPanel Stable 7.0.x
- Domain + SSL (Let’s Encrypt) bật HTTPS
- Tạo user deploy riêng (khuyến nghị) + SSH key
- Mở firewall:
  - 80/443 (web)
  - 22 (SSH)
  - (tuỳ) 3306/6379 **không mở public** nếu không cần

## 1) Runtime & Services
### Node.js
- Cài Node.js LTS (khuyến nghị 20.x+)
- `npm -v` đúng theo lockfile

### MySQL
- MySQL 8.x
- Tạo DB + user:
  - DB: `videoshare`
  - user: `videoshare` (grants hạn chế)
  - Ví dụ quyền tối thiểu:
    ```sql
    GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX ON videoshare.* TO 'videoshare'@'localhost';
    ```

### Redis
- Redis 6/7
- Bật persistence (AOF) nếu cần
- Không expose public port

## 2) Source code & build
### Pull code
- Clone repo vào `/www/wwwroot/videoshare`
- `cp .env.example .env` và set env production
- Hoặc dùng script tự động: `bash scripts/aapanel-install.sh`
  - Script chỉ hỏi các biến chính (DB/Redis/R2). Vui lòng review `.env.example` để bổ sung các biến tuỳ chọn (upload limits, payments, webhooks, analytics).

### Install deps
```bash
cd /www/wwwroot/videoshare
npm ci
```

> aaPanel Script (tự hỏi thông tin cài đặt + build):
> ```bash
> bash scripts/aapanel-install.sh
> ```

> Nếu `npm ci` báo lockfile không khớp hoặc thiếu resolved/integrity:
> ```bash
> npm install
> ```
> Sau đó commit lại `package-lock.json` lên repo để deployments sau dùng `npm ci`.

### Prisma
- Generate client:
```bash
npm run prisma:generate
```

- **Production**: dùng migrations
```bash
npx prisma migrate deploy
```

> **Không dùng `prisma db push` trên production** (xem phần 7).

### Build
```bash
npm run build
```

## 3) Web process (Next.js)
Khuyến nghị dùng **PM2** hoặc **systemd**.

### Option A — PM2
```bash
npm i -g pm2
pm2 start npm --name videoshare-web -- start
pm2 save
pm2 startup
```

### Option B — systemd (gợi ý)
- Service `videoshare-web.service`
- ExecStart: `npm start`
- WorkingDirectory: repo root
- Restart=always

## 4) Worker process (BullMQ)
Worker chạy riêng, không chạy trong web request.

### PM2
```bash
pm2 start npm --name videoshare-worker -- run worker
pm2 save
```

> Đảm bảo `REDIS_URL` trỏ đúng Redis, và Worker có quyền đọc/write DB.

## 5) Reverse proxy (Nginx trong aaPanel)
- Proxy 80/443 → `127.0.0.1:3000`
- Set headers:
  - `X-Forwarded-For`, `X-Forwarded-Proto`, `Host`
- Bật gzip/brotli tuỳ nhu cầu
- Timeout upload lớn (vì upload video):
  - `client_max_body_size` ≥ `UPLOAD_MAX_BYTES`
  - `proxy_read_timeout`/`proxy_send_timeout` tăng (vd 600s)

## 6) Smoke checks sau deploy
- Web:
  - `/` load OK
  - `/v/[id]` playback OK
  - `/upload` (logged-in) OK
- Admin:
  - `/admin/payments/config` mở được (ADMIN only)
  - webhooks endpoints trả 200/4xx đúng
- Worker:
  - có log chạy queue payments/storage
  - reconcile deposit test (devnet) OK
- DB:
  - `SeasonPass`, `ReferralBonus` tables có
  - `PaymentConfig` row id=1 có default fields

## 7) Prisma: `migrate deploy` vs `db push` (production rules)
- `prisma migrate deploy`
  - Chạy các **migration đã commit** trong `prisma/migrations/*`
  - Phù hợp production: audit/rollback-friendly, CI/CD chuẩn
- `prisma db push`
  - Sync schema trực tiếp vào DB, **không tạo migration lịch sử**
  - Dùng tốt cho dev/prototype nhưng **rủi ro production**: drift khó kiểm soát, dễ mất dữ liệu khi thay đổi enum/index/relations

**Rule of thumb**
- DEV: `db push`
- PROD: `migrate deploy`

## 8) Rollback plan
- Giữ tag release + backup DB trước migrate
- Nếu lỗi app:
  - rollback code tag
  - restart pm2/services
- Nếu migrate lỗi:
  - restore DB backup (an toàn nhất)

## 9) Monitoring tối thiểu
- PM2 logs + logrotate
- MySQL slow query log
- Redis memory usage
- Alert webhook thất bại (đã có Fraud/alerts trong admin)

---
Nếu bạn muốn, mình có thể thêm `docs/OPS_RUNBOOK.md` (SRE-lite) để quy định rotate keys, backups, và incident playbook.
## 10) Update tự động (GitHub releases)
Nếu repo có tag release (vd `v4.16.24`), có thể chạy script update:
```bash
bash scripts/aapanel-update.sh --yes
```

### Telegram notify (ưu tiên)
Set biến môi trường trong aaPanel hoặc shell:
```bash
export TELEGRAM_BOT_TOKEN="123456:ABC"
export TELEGRAM_CHAT_ID="123456789"
```
Script sẽ gửi thông báo khi có update hoặc khi update xong.

### Auto restart & backup (tuỳ chọn)
```bash
export AUTO_RESTART=1
export PM2_WEB_NAME="videoshare-web"
export PM2_WORKER_NAME="videoshare-worker"
export SYSTEMD_WEB_SERVICE=""
export SYSTEMD_WORKER_SERVICE=""

# Backup before migrate (requires mysqldump)
export BACKUP_BEFORE_MIGRATE=1
export BACKUP_DIR="/www/wwwroot/videoshare/backups"
export BACKUP_GZIP=1
```

### Log cleanup (tuỳ chọn)
Giúp tự xoá hoặc truncate log update nếu quá nặng:
```bash
export LOG_CLEANUP=1
export UPDATE_LOG_FILE="/www/wwwroot/videoshare/logs/update.log"
export LOG_MAX_BYTES=10485760  # 10MB
export LOG_TRUNCATE=1          # 1=truncate, 0=delete
```

### Post-update verify (tuỳ chọn)
Sau update có thể ping `/api/verify/status` để check nhanh:
```bash
export POST_UPDATE_VERIFY=1
export VERIFY_PORT=3000
```

Gợi ý chạy cron trong aaPanel (1 lần/ngày):
```
0 4 * * * /www/wwwroot/videoshare/scripts/aapanel-update.sh >> /www/wwwroot/videoshare/logs/update.log 2>&1
```

> Lưu ý: nên cấu hình logrotate hoặc ghi log theo ngày để tránh file log quá lớn.
