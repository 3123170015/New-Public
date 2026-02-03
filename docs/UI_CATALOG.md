## Bản đồ UI chi tiết (Bolt/Lovable/V0)

> Mỗi UI tập trung một mục tiêu, gọi đúng API cần thiết, dễ tối ưu tải và phân quyền.

### 1) Guest / Public

**1.1 Trang chủ (Home YouTube)**
- Mục tiêu: duyệt video + danh mục
- UI: Hero, danh mục chips, danh sách video grid (trending/recent/boosted)
- API:
  - `GET /api/external/public/trending`
  - `GET /api/external/public/videos`
  - `GET /api/external/public/categories`
  - `GET /api/external/public/tags`

**1.2 Feed kiểu TikTok**
- Mục tiêu: xem nhanh + tương tác nhẹ
- UI: player dọc, action bar (like/share/save)
- API:
  - `GET /api/external/public/videos`
  - `POST /api/external/videos/{id}/view`
  - `POST /api/external/videos/{id}/like`
  - `POST /api/external/videos/{id}/save`
  - `POST /api/external/videos/{id}/report`

**1.3 Trang video**
- Mục tiêu: xem + bình luận + tip sao
- UI: player, info, comment list, superthanks
- API:
  - `GET /api/external/public/videos/{id}`
  - `GET /api/external/videos/{id}/comments`
  - `POST /api/external/videos/{id}/comments`
  - `POST /api/external/stars/tip`
  - `POST /api/external/videos/{id}/view`

**1.4 NFT Market**
- Mục tiêu: duyệt + mua/bid
- UI: filters, card grid, auction banner
- API:
  - `GET /api/external/nft/listings`
  - `GET /api/external/nft/auctions`
  - `POST /api/external/nft/listings/{id}/buy`
  - `POST /api/external/nft/auctions/{id}/bid`

### 2) Auth / User

**2.1 Đăng ký / Đăng nhập**
- API:
  - `POST /api/external/auth/register`
  - `POST /api/external/auth/login`
  - `POST /api/external/auth/refresh`

**2.2 Hồ sơ + cài đặt**
- UI: profile form, settings toggles
- API:
  - `GET /api/external/me/profile`
  - `PATCH /api/external/me/profile`
  - `GET /api/external/me/settings`
  - `PATCH /api/external/me/settings`

**2.3 Playlist & Watch Later**
- API:
  - `GET /api/external/me/playlists`
  - `POST /api/external/me/playlists`
  - `POST /api/external/me/playlists/{id}/items`
  - `DELETE /api/external/me/playlists/{id}/items/{itemId}`
  - `GET /api/external/me/watch-later`

**2.4 Stars / Topup**
- UI: balance, history, topup form
- API:
  - `GET /api/external/stars/balance`
  - `GET /api/external/stars/transactions`
  - `POST /api/external/stars/topup/intent`
  - `GET /api/external/stars/topup/history`

### 3) Wallet Explorer

**3.1 WalletScan Search**
- UI: search bar + results tabs (wallets/assets/nfts/ledger/tx)
- API:
  - `GET /api/external/wallet-scan/search`
  - `GET /api/external/wallet-scan/wallets`
  - `GET /api/external/wallet-scan/assets`
  - `GET /api/external/wallet-scan/nfts`
  - `GET /api/external/wallet-scan/ledger`
  - `GET /api/external/wallet-scan/tx/{hash}`
  - `GET /api/external/wallet-scan/user/{username}`
  - `GET /api/external/wallet-scan/contracts`
  - `GET /api/external/wallet-scan/contract/{chain}/{address}`

### 4) Live

**4.1 Live Viewer**
- UI: player, chat, reactions
- API:
  - `GET /api/external/live/streams/{id}`
  - `GET /api/external/live/streams/{id}/viewer-stats`
  - `POST /api/external/live/streams/{id}/reactions`
  - `POST /api/external/live/{id}/playback/refresh`

**4.2 Live Moderator**
- UI: chat list + actions
- API:
  - `POST /api/external/live/streams/{id}/moderation/ban`
  - `POST /api/external/live/streams/{id}/moderation/unban`
  - `POST /api/external/live/streams/{id}/moderation/timeout`

**4.3 Live Schedule & Ingest**
- API:
  - `POST /api/external/live/schedules`
  - `PATCH /api/external/live/schedules/{id}`
  - `DELETE /api/external/live/schedules/{id}`
  - `GET /api/external/live/ingest/config`
  - `GET /api/external/live/ingest/status`

### 5) Creator / Studio

**5.1 Creator Stats**
- UI: charts, top fans
- API:
  - `GET /api/external/creator-stats/summary`
  - `GET /api/external/creator-stats/revenue`
  - `GET /api/external/creator-stats/top-fans`

**5.2 Boost**
- UI: boost form, metrics
- API:
  - `POST /api/external/boost/targets`
  - `GET /api/external/boost/metrics`
  - `GET /api/external/boost/status`

### 6) Admin

**6.1 API Keys**
- UI: table + allowlist editor
- API:
  - `GET /api/admin/api-keys`
  - `POST /api/admin/api-keys`
  - `PATCH /api/admin/api-keys/{id}`
  - `DELETE /api/admin/api-keys/{id}`

**6.2 Payments & Deposits**
- UI: deposits table + manual credit
- API:
  - `GET /api/admin/payments/deposits`
  - `POST /api/admin/payments/manual-credit`
  - `POST /api/admin/payments/manual-refund`

**6.3 Moderation**
- UI: queue + actions
- API:
  - `GET /api/admin/moderation/ai/queue`
  - `POST /api/admin/moderation/ai/{id}/decision`
  - `GET /api/admin/moderation/ai/status`
