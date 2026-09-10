import type { Metadata } from 'next';
import './globals.css';
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";

const geist = Geist({ subsets: ['latin'], variable: '--font-sans' });

export const metadata: Metadata = {
  title: 'Routy - 데이트 찜 지도',
  description: '가고 싶은 곳은 빈 하트, 다녀온 곳은 채운 하트!',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" className={cn("font-sans", geist.variable)}>
      <head />
      <body className="bg-gray-50 text-gray-900 antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}