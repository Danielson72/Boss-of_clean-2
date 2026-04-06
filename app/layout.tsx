import './globals.css';
import type { Metadata } from 'next';

// Force dynamic rendering for all pages — avoids experimental server actions
// runtime null-React crash during SSG with Next.js 13.5 + experimental.serverActions.
export const dynamic = 'force-dynamic';
import { DM_Sans, Playfair_Display } from 'next/font/google';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { AuthProvider } from '@/lib/context/AuthContext';
import { Toaster } from '@/components/ui/sonner';

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-body',
  display: 'swap',
});

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-display',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://bossofclean.com'),
  title: {
    default: "Boss of Clean \u2014 Florida's Home Services Marketplace",
    template: "%s | Boss of Clean",
  },
  description: 'Find trusted, verified home service professionals in Florida. Get free quotes for cleaning, pressure washing, landscaping, pool cleaning, and more. Purrfection is our Standard.',
  keywords: 'cleaning services Florida, house cleaning Florida, residential cleaning, pressure washing, carpet cleaning, deep cleaning, professional cleaners Florida, home services marketplace, pool cleaning, landscaping',
  authors: [{ name: 'Boss of Clean' }],
  creator: 'Boss of Clean',
  publisher: 'Boss of Clean',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
  manifest: '/site.webmanifest',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    title: "Boss of Clean \u2014 Florida's Home Services Marketplace",
    description: 'Find trusted, verified home service professionals in Florida. Get free quotes for cleaning, pressure washing, landscaping, pool cleaning, and more.',
    url: 'https://bossofclean.com',
    siteName: 'Boss of Clean',
    type: 'website',
    locale: 'en_US',
    images: [{ url: '/og-logo.png', width: 1200, height: 630, alt: 'Boss of Clean \u2014 Florida Home Services Marketplace' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: "Boss of Clean \u2014 Florida's Home Services Marketplace",
    description: 'Find trusted, verified home service professionals in Florida. Get free quotes for cleaning, pressure washing, landscaping, pool cleaning, and more.',
    images: ['/og-logo.png'],
    creator: '@bossofclean',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${dmSans.variable} ${playfair.variable} font-sans`}>
        <AuthProvider>
          {/* Skip to main content link for keyboard users */}
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:bg-blue-600 focus:text-white focus:px-4 focus:py-2 focus:rounded-md focus:outline-none focus:ring-2 focus:ring-white"
          >
            Skip to main content
          </a>
          <div className="min-h-screen flex flex-col">
            <Header />
            <main id="main-content" className="flex-grow" tabIndex={-1}>
              {children}
            </main>
            <Footer />
          </div>
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}