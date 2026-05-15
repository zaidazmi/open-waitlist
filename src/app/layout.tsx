import type { Metadata } from 'next';
import { Suspense } from 'react';
import { Inter, Outfit } from 'next/font/google';
import { AnalyticsTracker } from '@/components/AnalyticsTracker';
import './globals.css';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
});

const outfit = Outfit({
  variable: '--font-outfit',
  subsets: ['latin'],
});

const appName = process.env.NEXT_PUBLIC_APP_NAME || 'Open Waitlist';

export const metadata: Metadata = {
  title: `${appName} | Verified Referral Waitlist`,
  description:
    'An open-source waitlist starter with email verification, referral links, Supabase storage, and Resend email delivery.',
  icons: {
    icon: [{ url: '/icon.svg', type: 'image/svg+xml' }],
    shortcut: '/icon.svg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${outfit.variable} antialiased`}>
        <Suspense fallback={null}>
          <AnalyticsTracker />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
