import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { AuthProvider } from '@/lib/context/AuthContext';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Boss of Clean',
  description: 'Find professional cleaning services in Florida instantly. 500+ verified cleaners across all 67 counties. Residential, commercial, deep cleaning, pressure washing & more. Licensed & insured professionals.',
  keywords: 'cleaning services Florida, house cleaning Florida, commercial cleaning, pressure washing, carpet cleaning, residential cleaning, professional cleaners Florida',
  openGraph: {
    title: 'Boss of Clean - Florida\'s #1 Cleaning Directory',
    description: 'Find Any Cleaner in 60 Seconds. 500+ Verified Professional Cleaners Across All 67 Florida Counties.',
    type: 'website',
    locale: 'en_US',
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
          <div className="min-h-screen flex flex-col">
            <Header />
            <main className="flex-grow">
              {children}
            </main>
            <Footer />
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}