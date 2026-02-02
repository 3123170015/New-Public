# Live ingest mẫu (ngắn gọn, thực chiến)

Tài liệu này mô tả 3 hướng phổ biến để ingest live + xuất HLS, phù hợp với backend hiện tại.

## 1) Nginx-RTMP + FFmpeg → HLS → sync R2

### Luồng tổng quan
- OBS/FFmpeg → RTMP → nginx-rtmp
- Nginx ghi HLS (`.m3u8 + .ts`) ra thư mục local
- Cron/daemon đồng bộ HLS lên R2
- Backend lưu `playbackUrl` (R2 public URL hoặc signed URL)

### Cấu hình nginx-rtmp mẫu (rút gọn)
```nginx
rtmp {
  server {
    listen 1935;
    chunk_size 4096;

    application live {
      live on;
      record off;

      hls on;
      hls_path /var/media/hls;
      hls_fragment 4;
      hls_playlist_length 20;
    }
  }
}
```

### Ví dụ FFmpeg ingest (HLS)
```bash
ffmpeg -re -i input.mp4 \
  -c:v libx264 -preset veryfast -tune zerolatency \
  -c:a aac -f flv rtmp://HOST/live/STREAM_KEY
```

### Sync lên R2 (ví dụ rclone)
```bash
rclone sync /var/media/hls r2:my-bucket/hls --create-empty-src-dirs
```

### Backend cần lưu
- `playbackUrl`: `https://<cdn-or-r2>/hls/<streamKey>/index.m3u8`
- `streamKey` (nếu bạn quản lý key)

## 2) Cloudflare Stream Live

### Luồng tổng quan
- OBS/FFmpeg → Cloudflare Live (ingest URL + stream key)
- Cloudflare tự xuất HLS/DASH
- Backend chỉ lưu `playbackUrl` (Cloudflare HLS URL)

### Lưu ý
- Nên dùng webhook Cloudflare để cập nhật trạng thái live (start/stop)
- Có thể lấy `playbackUrl` từ API Cloudflare Stream

## 3) Dùng sẵn link .m3u8 (live signal)

### Quy tắc vận hành
- Backend lưu `playbackUrl` là link `.m3u8` do bạn cung cấp
- Cứ mỗi ~30s ping/HEAD check link HLS
- Nếu không sống > 60s → đánh `status=OFFLINE`
- Khi link sống lại → `status=LIVE`

### Gợi ý health-check (logic)
```
if m3u8 không trả 200 trong 2 lần check liên tiếp (>=60s):
  status = OFFLINE
else:
  status = LIVE
```

### Phù hợp khi
- Bạn có nguồn HLS bên thứ 3
- Cần phát nhanh mà không tự vận hành ingest

