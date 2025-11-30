import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "英単語アプリ",
  description: "英単語を学習するアプリ",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}

