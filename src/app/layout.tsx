import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';

const gmarketSans = localFont({
  src: '../../public/fonts/GmarketSansBold.woff',
  variable: '--font-gmarket',
  display: 'swap',
});

const sCoreDream = localFont({
  src: '../../public/fonts/S-CoreDream-4Regular.woff',
  variable: '--font-score',
  display: 'swap',
});

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
    <html lang="ko" className={`${gmarketSans.variable} ${sCoreDream.variable}`}>
      <body className="bg-[#FAF7F2] text-[#2D241E] antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}