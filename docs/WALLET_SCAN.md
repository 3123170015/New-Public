# WalletScan (Ledger & On-chain)

Tài liệu này mô tả cách frontend thiết kế màn hình ledger giống Tronscan/Bscscan cho hệ thống Stars + NFT hiện tại. Backend đã có endpoint `/api/external/wallet-scan/search` để tổng hợp dữ liệu theo username, địa chỉ ví, transaction hash hoặc contract address.

## Prompt gợi ý cho Bolt/Lovable (WalletScan UI)

```
Bạn là frontend builder. Hãy tạo trang "WalletScan Explorer" sử dụng các endpoint sau:
- GET /api/external/wallet-scan/search?q=...
- GET /api/external/wallet-scan/tx/{hash}
- GET /api/external/wallet-scan/user/{username}
- GET /api/external/wallet-scan/wallets?username=...
- GET /api/external/wallet-scan/assets?username=...&chain=...
- GET /api/external/wallet-scan/ledger?username=...
- GET /api/external/wallet-scan/nfts?username=...
- GET /api/external/wallet-scan/nft-transfers?username=...

Yêu cầu UI:
1) Search bar (username/userId/address/txHash/contract).
2) Tabs: Wallets, Assets, Ledger, NFTs, Transfers, Swaps.
3) Ledger hiển thị starTransactions nếu includePrivate=1 và user đăng nhập.
4) Render addressHits/contractHits/txHits/userHits thành "search result cards".
5) Table cho ledger (timestamp, type, chain, amount, memo/txHash).
6) NFT grid (thumbnail, collection, listing/auction status).
7) Assets snapshot theo chain, có filter chain.
```

## Mục tiêu

- Hiển thị lịch sử nạp (Stars) + ledger nội bộ.
- Hiển thị NFT export/on-chain info (tx hash, contract).
- Hỗ trợ tìm kiếm theo user / tx / contract / wallet.
- Tương lai mở rộng payout on-chain (hiện trả về mảng `payoutLedger` rỗng).

## Endpoint chính (đã triển khai)

```
GET /api/external/wallet-scan/search
```

Headers:

- `X-API-Key: <key>`
- `Authorization: Bearer <jwt>` (nếu muốn gắn user để lấy ledger chi tiết)

Query parameters:

| Field | Ý nghĩa |
| --- | --- |
| username | tìm theo username |
| userId | tìm theo userId |
| address | tìm theo địa chỉ ví |
| txHash | tìm theo tx hash |
| contractAddress | tìm theo contract |
| chain | SOLANA/ETHEREUM/POLYGON/BSC/BASE/TRON |
| page/take | phân trang ledger |

## Response chuẩn

- `user`: thông tin user tìm được.
- `wallets`: danh sách ví liên kết (UserWallet).
- `ledger`: danh sách ledger tổng hợp (Stars + Deposit + NFT export).
- `deposits`: chi tiết StarDeposit (nạp Stars).
- `starTransactions`: chi tiết StarTransaction (gift, tip, topup, refund...).
- `nftExports`: NftExportRequest (on-chain NFT).
- `nftTransfers`: lịch sử chuyển NFT (sale/auction/export).
- `dexSwaps`: lịch sử swap/DEX (placeholder, chưa crawl on-chain).
- `walletAssets`: snapshot on-chain holdings (UserWalletAsset).
- `payoutLedger`: tương lai payout on-chain (hiện rỗng, yêu cầu includePrivate).
- `nftTransfers`: lịch sử chuyển NFT (sale/auction/export).
- `dexSwaps`: lịch sử swap/DEX (placeholder).

## Bộ endpoint explorer (đã triển khai)

- GET `/api/external/wallet-scan/tx/{hash}`: tra nhanh theo txHash
- GET `/api/external/wallet-scan/user/{username}`: tra theo username (phân trang)
- GET `/api/external/wallet-scan/wallets?username=...`: danh sách ví
- GET `/api/external/wallet-scan/assets?username=...&chain=...`: snapshot tài sản on-chain
- GET `/api/external/wallet-scan/nfts?username=...`: danh sách NFT + listings/auctions/sales
- GET `/api/external/wallet-scan/ledger?username=...`: ledger tổng hợp
- GET `/api/external/wallet-scan/nft-transfers?username=...`: lịch sử chuyển NFT
- GET `/api/external/wallet-scan/swaps?chain=...`: lịch sử DEX (placeholder)
- GET `/api/external/wallet-scan/payouts?username=...&includePrivate=1`: payout ledger (private)
- GET `/api/external/wallet-scan/contracts`: danh sách contract export
- GET `/api/external/wallet-scan/contract/{chain}/{address}`: chi tiết contract export

## Cách hiển thị Ledger

Mỗi item trong `ledger` có `kind`:

- `STAR_TX`: giao dịch Stars nội bộ (chain = OFFCHAIN).
- `DEPOSIT`: giao dịch nạp on-chain → cộng Stars.
- `NFT_EXPORT`: export NFT on-chain.

Frontend có thể map:

- Icon theo `kind`
- Màu theo `status` (CREATED/SUBMITTED/CONFIRMED/CREDITED/FAILED)
- Hiển thị `txHash` + `contractAddress` (nếu có)

## Gợi ý UI (Luxury + Explorer)

1. Search bar (username / tx / contract / wallet).
2. Tabs:
   - Ledger (default)
   - Deposits
   - NFTs on-chain
   - Wallet Assets
3. Card summary:
   - Stars balance
   - Total deposits
   - Total NFT exports

## Ghi chú tương lai

- Payout on-chain: sẽ fill vào `payoutLedger`.
- On-chain NFT sale: có thể thêm ledger `NFT_SALE` khi triển khai.
