# Ghi chú OpenAPI (tiếng Việt)

File OpenAPI giúp Bolt/Lovable (và các tool UI generator) đọc được các endpoint quan trọng của backend để dựng giao diện tự động.

## File đã có
- `docs/openapi.yaml`: bản YAML chính (ưu tiên).
- `docs/openapi.json`: bản JSON rút gọn (có thể import nhanh).

## Cách dùng nhanh
1. Mở Bolt/Lovable → import OpenAPI.
2. Chọn file `docs/openapi.yaml` (khuyến nghị).
3. Nếu tool chỉ nhận JSON → dùng `docs/openapi.json`.
4. Trong tool, hãy set server URL đúng domain backend của bạn (Production/Dev).

## Nhóm API đã mô tả
- `/api/external/*`: dùng cho frontend/app khác (X-API-Key + JWT cookie/Bearer).
- `/api/me/*`: nhóm user (thông báo, watch later, playlists…).
- `/api/admin/*`: nhóm admin (cấu hình, API key, payments, storage, moderation…).
- Các nhóm phổ biến: playlists, upload, comments, stars, NFT.

## Lưu ý bảo mật
- External API luôn cần `X-API-Key`.
- Khi gọi từ browser, backend kiểm tra allowlist domain trong API key.
- Mobile/Expo dùng `Authorization: Bearer <access_token>`.

## Nếu cần thêm endpoint
1. Thêm route mới ở backend.
2. Cập nhật `docs/openapi.yaml`.
3. Cập nhật `docs/openapi.json` để giữ đồng bộ với YAML (khuyến nghị).

Nếu bạn muốn mình mở rộng OpenAPI thêm endpoint chi tiết hơn, hãy gửi danh sách route cụ thể cần bổ sung.
