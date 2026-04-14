'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Menu, X, User, LogOut } from 'lucide-react';
import { useAuth } from '@/lib/context/AuthContext';

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const { user, loading } = useAuth();
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMenuOpen) {
        setIsMenuOpen(false);
        menuButtonRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isMenuOpen]);

  useEffect(() => {
    if (isMenuOpen && mobileMenuRef.current) {
      const focusableElements = mobileMenuRef.current.querySelectorAll(
        'a[href], button:not([disabled])'
      );
      const firstElement = focusableElements[0] as HTMLElement;
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

      const handleTabKey = (e: KeyboardEvent) => {
        if (e.key !== 'Tab') return;
        if (e.shiftKey && document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      };

      document.addEventListener('keydown', handleTabKey);
      firstElement?.focus();
      return () => document.removeEventListener('keydown', handleTabKey);
    }
  }, [isMenuOpen]);

  const navLinkClass = `text-sm font-medium tracking-wide transition-colors duration-200 ${
    isScrolled
      ? 'text-brand-dark/80 hover:text-brand-gold'
      : 'text-brand-dark/80 hover:text-brand-gold'
  }`;

  return (
    <header
      className={`sticky top-0 z-50 transition-all duration-300 ${
        isScrolled
          ? 'bg-white/95 backdrop-blur-md shadow-sm border-b border-gray-100'
          : 'bg-white border-b border-gray-100'
      }`}
      role="banner"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 lg:h-18">
          {/* Logo */}
          <Link href="/" className="flex-shrink-0 flex items-center gap-2.5" aria-label="Boss of Clean - Home">
            <Image
              src="/boss-of-clean-logo.png"
              alt="Boss of Clean"
              width={56}
              height={56}
              className="rounded-lg h-12 w-12 sm:h-14 sm:w-14"
              priority
            />
            <div className="flex flex-col">
              <span className="text-lg font-bold tracking-tight text-brand-dark font-display">
                Boss of Clean
              </span>
              <span className="text-[10px] tracking-[0.15em] uppercase text-brand-gold font-medium -mt-0.5 hidden sm:block">
                Purrfection is our Standard
              </span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8" aria-label="Main navigation">
            <Link href="/" className={navLinkClass}>Home</Link>
            <Link href="/search" className={navLinkClass}>Search</Link>
            <Link href="/professionals" className={navLinkClass}>Professionals</Link>
            <Link href="/pricing" className={navLinkClass}>Pricing</Link>
            <Link href="/about" className={navLinkClass}>About</Link>
            <Link href="/contact" className={navLinkClass}>Contact</Link>

            <div className="w-px h-5 bg-gray-200 mx-1" />

            {!loading && user ? (
              <div className="flex items-center gap-3">
                <Link
                  href="/dashboard"
                  className="text-sm font-medium text-brand-dark/80 hover:text-brand-gold transition-colors flex items-center gap-1.5"
                >
                  <User className="h-4 w-4" aria-hidden="true" />
                  Dashboard
                </Link>
                <a
                  href="/logout"
                  className="text-sm font-medium text-brand-dark/60 hover:text-brand-dark transition-colors flex items-center gap-1.5"
                  aria-label="Log out of your account"
                >
                  <LogOut className="h-4 w-4" aria-hidden="true" />
                  Sign Out
                </a>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link href="/login" className={navLinkClass}>
                  Sign In
                </Link>
                <Link
                  href="/signup"
                  className="border border-brand-gold text-brand-gold hover:bg-brand-gold hover:text-white px-4 py-1.5 rounded-lg text-sm font-semibold tracking-wide transition-all duration-200"
                >
                  Sign Up
                </Link>
                <Link
                  href="/signup"
                  className="bg-brand-gold hover:bg-brand-gold-light text-white px-5 py-2 rounded-lg text-sm font-semibold tracking-wide transition-all duration-200 shadow-sm hover:shadow-md"
                >
                  List Your Business
                </Link>
              </div>
            )}
          </nav>

          {/* Mobile menu button */}
          <button
            ref={menuButtonRef}
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden inline-flex items-center justify-center p-2 rounded-lg text-brand-dark hover:bg-brand-cream transition-colors"
            aria-expanded={isMenuOpen}
            aria-controls="mobile-menu"
            aria-label={isMenuOpen ? 'Close main menu' : 'Open main menu'}
          >
            {isMenuOpen ? (
              <X className="h-5 w-5" aria-hidden="true" />
            ) : (
              <Menu className="h-5 w-5" aria-hidden="true" />
            )}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <nav
            id="mobile-menu"
            ref={mobileMenuRef}
            className="md:hidden border-t border-gray-100"
            aria-label="Mobile navigation"
            role="navigation"
          >
            <div className="py-3 space-y-1">
              {['Home', 'Search', 'Professionals', 'Pricing', 'About', 'Contact'].map((item) => (
                <Link
                  key={item}
                  href={item === 'Home' ? '/' : `/${item.toLowerCase()}`}
                  className="block px-3 py-2.5 text-sm font-medium text-brand-dark/80 hover:text-brand-gold hover:bg-brand-cream rounded-lg transition-colors"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {item}
                </Link>
              ))}

              <div className="my-2 border-t border-gray-100" />

              {!loading && user ? (
                <>
                  <Link
                    href="/dashboard"
                    className="flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-brand-dark/80 hover:text-brand-gold hover:bg-brand-cream rounded-lg transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    <User className="h-4 w-4" aria-hidden="true" />
                    Dashboard
                  </Link>
                  <a
                    href="/logout"
                    className="flex items-center gap-2 w-full px-3 py-2.5 text-sm font-medium text-brand-dark/60 hover:text-brand-dark hover:bg-brand-cream rounded-lg transition-colors text-left"
                    aria-label="Log out of your account"
                  >
                    <LogOut className="h-4 w-4" aria-hidden="true" />
                    Sign Out
                  </a>
                </>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="block px-3 py-2.5 text-sm font-medium text-brand-dark/80 hover:text-brand-gold hover:bg-brand-cream rounded-lg transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/signup"
                    className="block px-3 py-2.5 text-sm font-medium text-brand-dark/80 hover:text-brand-gold hover:bg-brand-cream rounded-lg transition-colors"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    Sign Up
                  </Link>
                  <Link
                    href="/signup"
                    className="block mx-3 mt-2 text-center bg-brand-gold hover:bg-brand-gold-light text-white px-4 py-2.5 rounded-lg text-sm font-semibold tracking-wide transition-all"
                    onClick={() => setIsMenuOpen(false)}
                  >
                    List Your Business
                  </Link>
                </>
              )}
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
