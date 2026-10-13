import type { Metadata, Viewport } from 'next';
import './globals.css';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';

export const metadata: Metadata = {
  metadataBase: new URL('https://panchavani.com'),
  title: { default: 'PANCHAVANI — Hindu Panchang & Calendar', template: '%s | PANCHAVANI' },
  description: 'Discover the traditions, calendars, festivals and astronomical foundations of Hindu time. PANCHAVANI visual concept preview.',
  robots: { index: false, follow: false },
  icons: { icon: [{ url: '/imgs/favicon_gold_frame.ico', type: 'image/x-icon', sizes: 'any' }], shortcut: '/imgs/favicon_gold_frame.ico' },
  openGraph: { type: 'website', siteName: 'PANCHAVANI', title: 'PANCHAVANI — Harmony with Cosmic Time', description: 'A visual preview of our upcoming Hindu calendar and Panchang experience.' },
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#050505' };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><SiteHeader /><main id="main-content">{children}</main><SiteFooter /></body></html>;
}
