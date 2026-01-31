# Backend Skills

## Kiến trúc chính
- Next.js App Router, API routes nằm trong `/app/api/*`.
- Prisma ORM, DB schema: `prisma/schema.prisma`.
- Worker queue ở `worker/` (BullMQ + Redis).

## Auth & Security
- NextAuth cho web nội bộ.
- External API: `/api/external/*` uses **X-API-Key** + JWT (cookie or Bearer).
- Kiểm tra allowlist domain theo `ApiKey.allowedOrigins`.
- Scope enforcement: `scopes` are the allowed scopes; `strictScopes=true` denies any scope not explicitly listed.

## Stars/Payments
- Topup Stars: `StarDeposit`, `StarTransaction`.
- Memo format configurable: `depositMemoFormat` trong Payment Config.
- Alerts Telegram: `telegramBotToken` + `telegramChatId`.
- Flow: webhook/polling → match memo/depositId → CONFIRMED/CREDITED → cộng stars.

## API Patterns
- Input validation dùng Zod.
- Rate limit dùng `lib/rateLimit`.
- Trả JSON `{ ok, data|error }`.
