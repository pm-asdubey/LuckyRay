import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'LuckyRay — AI-powered Jyotish',
    template: '%s | LuckyRay',
  },
  description:
    'LuckyRay combines deterministic Vedic astrology calculations with conversational AI to help you understand your Jyotish birth chart.',
  keywords: ['Jyotish', 'Vedic astrology', 'birth chart', 'kundli', 'AI astrology'],
  authors: [{ name: 'LuckyRay' }],
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0d0f13',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
