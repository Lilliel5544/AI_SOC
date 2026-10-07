import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "SOC AI | Log Console",
  description: "Tra cứu và quản lý cảnh báo từ hệ thống ánh xạ SOC AI.",
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};
export default function RootLayout({children}: Readonly<{children: React.ReactNode}>) {
  return <html lang="vi"><body>{children}</body></html>;
}
