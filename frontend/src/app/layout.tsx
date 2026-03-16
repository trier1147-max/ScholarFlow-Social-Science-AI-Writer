import type { Metadata } from "next";
import { Inter, Source_Serif_4 } from "next/font/google";
import { ToastProvider } from "@/components/providers/ToastProvider";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const sourceSerif = Source_Serif_4({
  variable: "--font-serif",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ScholarFlow - AI 学术写作助手",
  description: "基于私有文献库的 AI 学术写作工作台，为人文社科研究者打造",
  keywords: ["学术写作", "AI", "文献管理", "论文写作", "人文社科"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body
        className={`${inter.variable} ${sourceSerif.variable} font-sans antialiased`}
      >
        {children}
        <ToastProvider />
      </body>
    </html>
  );
}
