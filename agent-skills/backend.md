# Backend Skills

## Kiến trúc chính
- Next.js App Router, API routes nằm trong `/app/api/*`.
- Prisma ORM, DB schema: `prisma/schema.prisma`.
- Worker queue ở `worker/` (BullMQ + Redis).

## Auth & Security
- NextAuth cho web nội bộ.
- External API: `/api/external/*` sử dụng **X-API-Key** + JWT (cookie hoặc Bearer).
- Kiểm tra allowlist domain theo `ApiKey.allowedOrigins`.
- Scope enforcement: `strictScopes` + `scopes` để giới hạn quyền.

## Stars/Payments
- Topup Stars: `StarDeposit`, `StarTransaction`.
- Memo format configurable: `depositMemoFormat` trong Payment Config.
- Alerts Telegram: `telegramBotToken` + `telegramChatId`.
- Flow: webhook/polling → match memo/depositId → CONFIRMED/CREDITED → cộng stars.

## API Patterns
- Input validation dùng Zod.
- Rate limit dùng `lib/rateLimit`.
- Trả JSON `{ ok, data|error }`.
