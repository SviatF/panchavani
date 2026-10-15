import type { Metadata, Viewport } from 'next';
import './globals.css';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { CitySelectionProvider } from '@/components/city-selection';

export const metadata: Metadata = {
  metadataBase: new URL('https://panchavani.com'),
  title: { default: 'PANCHAVANI — Hindu Panchang & Calendar', template: '%s | PANCHAVANI' },
  description: 'Explore Hindu Panchang principles, lunar timekeeping, regional traditions and independently reviewed calendar research.',
  robots: { index: false, follow: false },
  icons: { icon: [{ url: '/imgs/favicon_gold_frame.ico', type: 'image/x-icon', sizes: 'any' }], shortcut: '/imgs/favicon_gold_frame.ico' },
  openGraph: { type: 'website', siteName: 'PANCHAVANI', title: 'PANCHAVANI — Harmony with Cosmic Time', description: 'Understand traditional Hindu calendars, astronomy and regional observances.' },
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#050505' };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body><CitySelectionProvider><SiteHeader /><main id="main-content">{children}</main><SiteFooter /></CitySelectionProvider></body></html>;
}
