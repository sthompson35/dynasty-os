import type { Metadata } from 'next';
import './globals.css';
import { DynastyChatWidget } from '@/components/dynasty/dynasty-chat-widget';
import { TooltipProvider } from '@/components/ui/tooltip';

export const dynamic = 'force-dynamic';

const appUrl = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXTAUTH_URL ?? 'http://localhost:3005';

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: 'Dynasty PropertyOS',
    template: '%s | Dynasty PropertyOS',
  },
  description: 'A premium real estate investment operating system for disciplined property acquisition, portfolio tracking, and deal analysis.',
  icons: {
    icon: '/favicon.svg',
    shortcut: '/favicon.svg',
  },
  openGraph: {
    title: 'Dynasty PropertyOS',
    description: 'Portfolio command center, property manager, and investor deal analyzer.',
    images: ['/og-image.png'],
    type: 'website',
  },
};

export default function RootLayout(props: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans" suppressHydrationWarning>
        <TooltipProvider delayDuration={200}>
          {props?.children}
          <DynastyChatWidget />
        </TooltipProvider>
      </body>
    </html>
  );
}
