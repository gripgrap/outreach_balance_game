import type { Metadata } from "next";
import { Black_Han_Sans, Gothic_A1, Nanum_Pen_Script } from "next/font/google";
import "./globals.css";

const display = Black_Han_Sans({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const body = Gothic_A1({
  weight: ["400", "500", "700", "900"],
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const script = Nanum_Pen_Script({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-script",
  display: "swap",
});

export const metadata: Metadata = {
  title: "BALANCE GAME | 청년부 수련회",
  description: "청년 수련회 A/B 밸런스 게임",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className={`${display.variable} ${body.variable} ${script.variable}`}>
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
