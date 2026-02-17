import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { AuthProvider } from '@/lib/context/AuthContext';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Boss of Clean — Purrfection is our Standard',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://bossofclean.com'),
  description: 'Find professional cleaning services in Florida instantly. 500+ cleaning professionals across all 67 counties. Residential, commercial, deep cleaning, pressure washing & more. Licensed & insured cleaning professionals.',
  keywords: 'cleaning services Florida, house cleaning Florida, commercial cleaning, pressure washing, carpet cleaning, residential cleaning, professional cleaners Florida',
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: '/apple-touch-icon.png',
  },
  manifest: '/site.webmanifest',
  openGraph: {
    title: 'Boss of Clean - Florida\'s #1 Cleaning Directory',
    description: 'Find Any Cleaner in 60 Seconds. 500+ Professional Cleaners Across All 67 Florida Counties.',
    type: 'website',
    locale: 'en_US',
    images: [{ url: '/og-logo.png', width: 1200, height: 630 }],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
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
        </AuthProvider>
      </body>
    </html>
  );
}