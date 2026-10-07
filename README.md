# SOC AI Log Console — mã nguồn

Đây là mã nguồn của trang SOC AI (gồm biểu đồ thời gian và biểu đồ quạt theo IP). 15 log ban đầu nằm trong `seed.json`.

Trang tự lấy dữ liệu mới từ `GET /api/alerts` mỗi 5 giây khi tab đang mở; khi quay lại tab, trang tải ngay. Các biểu đồ và danh sách cập nhật theo dữ liệu mới. Đây là cập nhật gần realtime theo chu kỳ, không phải WebSocket. Hệ thống SOC AI cần chủ động gửi log vào `POST /api/alerts` để dữ liệu mới xuất hiện.

## Thành phần chính

- `app/page.tsx`: bảng cảnh báo, tìm kiếm, lọc, nhập/xuất JSON và xử lý log.
- `app/TrafficCharts.tsx`: lưu lượng log theo thời gian và log tích lũy.
- `app/IpPieChart.tsx`: phân bố theo IP nguồn hoặc IP đích.
- `app/api/alerts/route.ts`: API đọc, nhập và cập nhật log.
- `db/schema.ts`, `drizzle/`: bảng dữ liệu và migration Cloudflare D1.
- `app/globals.css`: giao diện và bố cục responsive.
- `.openai/hosting.json`: cấu hình binding D1; project_id đã bỏ khỏi bản tải về.

## Chạy thử tại máy

Yêu cầu Node.js >= 22.13 và pnpm (qua Corepack hoặc cài riêng). Dự án dùng Vinext/Cloudflare Workers và cần D1 để API hoạt động.

1. Chạy `corepack pnpm install`.
2. Chạy `pnpm build` để tạo cấu hình Worker cục bộ.
3. Áp dụng migration một lần bằng lệnh:
   `node --import ./scripts/sites-env.mjs ./node_modules/wrangler/bin/wrangler.js d1 execute DB --local --config dist/server/wrangler.json --persist-to .wrangler/state --file drizzle/0000_marvelous_johnny_blaze.sql`
4. Chạy `pnpm start` để xem bản Worker cục bộ.

Khi triển khai thành một Site mới, nền tảng sẽ cấp D1 cho binding `DB` và áp dụng migration. Trang nhận log mới bằng nút Nhập JSON hoặc `POST /api/alerts`; cần tự kết nối hệ thống SOC AI với API này và cấu hình xác thực trước khi gửi log thật.


## Cập nhật Worker Cloudflare đã tạo

1. Nếu đang dùng thư mục mã nguồn cũ, chỉ chép tệp `app/page.tsx` từ bản này vào đúng vị trí của thư mục cũ.
2. Chạy `npx.cmd --yes pnpm@10 build` trong PowerShell. Lệnh build tạo lại `dist/server/wrangler.json`, vì vậy cần gắn lại binding D1 như dưới đây.
3. Chạy các dòng PowerShell này từ thư mục chứa `package.json`:

```powershell
$path = (Resolve-Path '.\dist\server\wrangler.json').Path
$cfg = Get-Content $path -Raw | ConvertFrom-Json
$cfg.name = 'soc-ai-log-console'
$cfg.topLevelName = 'soc-ai-log-console'
$cfg.d1_databases[0].binding = 'DB'
$cfg.d1_databases[0].database_name = 'soc-ai-logs'
$cfg.d1_databases[0].database_id = '3391c366-6ed5-49fc-bd1d-99d2e6c66c4f'
[System.IO.File]::WriteAllText($path, ($cfg | ConvertTo-Json -Depth 100), [System.Text.UTF8Encoding]::new($false))
npx.cmd --yes pnpm@10 exec wrangler deploy --config .\dist\server\wrangler.json
```

Không cần chạy lại migration D1 và không cần tạo cơ sở dữ liệu mới. Mã mới chỉ làm trang tự đọc lại dữ liệu, không thay đổi bảng `alerts`. Sau khi deploy, mở hai tab; nhập một log vào tab thứ nhất để kiểm tra tab thứ hai tự hiển thị trong khoảng 5 giây. Để SOC AI đẩy log tự động, cần triển khai xác thực cho chương trình gửi log; hiện API chưa có khóa dành riêng cho ứng dụng gửi.
