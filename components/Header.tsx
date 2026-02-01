'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Menu, X, User, LogOut } from 'lucide-react';
import { useAuth } from '@/lib/context/AuthContext';

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, signOut, loading } = useAuth();
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  // Close menu on escape key
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

  // Focus trap for mobile menu
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

  return (
    <header className="bg-white shadow-md sticky top-0 z-50" role="banner">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex-shrink-0" aria-label="Boss of Clean - Home">
            <div className="text-2xl font-bold text-blue-600">
              BOSS OF CLEAN
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex space-x-8" aria-label="Main navigation">
            <Link href="/" className="text-gray-700 hover:text-blue-600 px-3 py-2 text-sm font-medium">
              Home
            </Link>
            <Link href="/search" className="text-gray-700 hover:text-blue-600 px-3 py-2 text-sm font-medium">
              Search
            </Link>
            <Link href="/pricing" className="text-gray-700 hover:text-blue-600 px-3 py-2 text-sm font-medium">
              Pricing
            </Link>
            <Link href="/about" className="text-gray-700 hover:text-blue-600 px-3 py-2 text-sm font-medium">
              About
            </Link>
            <Link href="/contact" className="text-gray-700 hover:text-blue-600 px-3 py-2 text-sm font-medium">
              Contact
            </Link>

            {!loading && (
              <>
                {user ? (
                  <div className="flex items-center space-x-4">
                    <Link href="/dashboard" className="text-gray-700 hover:text-blue-600 px-3 py-2 text-sm font-medium flex items-center">
                      <User className="h-4 w-4 mr-1" aria-hidden="true" />
                      Dashboard
                    </Link>
                    <button
                      onClick={signOut}
                      className="text-gray-700 hover:text-blue-600 px-3 py-2 text-sm font-medium flex items-center"
                      aria-label="Log out of your account"
                    >
                      <LogOut className="h-4 w-4 mr-1" aria-hidden="true" />
                      Logout
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <Link href="/login" className="text-gray-700 hover:text-blue-600 px-3 py-2 text-sm font-medium">
                      Login
                    </Link>
                    <Link href="/signup" className="bg-blue-600 text-white hover:bg-blue-700 px-4 py-2 rounded-md text-sm font-medium">
                      Sign Up
                    </Link>
                  </div>
                )}
              </>
            )}
          </nav>

          {/* Mobile menu button */}
          <button
            ref={menuButtonRef}
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:text-blue-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-expanded={isMenuOpen}
            aria-controls="mobile-menu"
            aria-label={isMenuOpen ? 'Close main menu' : 'Open main menu'}
          >
            {isMenuOpen ? (
              <X className="h-6 w-6" aria-hidden="true" />
            ) : (
              <Menu className="h-6 w-6" aria-hidden="true" />
            )}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <nav
            id="mobile-menu"
            ref={mobileMenuRef}
            className="md:hidden"
            aria-label="Mobile navigation"
            role="navigation"
          >
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-white border-t">
              <Link
                href="/"
                className="text-gray-700 hover:text-blue-600 block px-3 py-2 text-base font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-md"
                onClick={() => setIsMenuOpen(false)}
              >
                Home
              </Link>
              <Link
                href="/search"
                className="text-gray-700 hover:text-blue-600 block px-3 py-2 text-base font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-md"
                onClick={() => setIsMenuOpen(false)}
              >
                Search
              </Link>
              <Link
                href="/pricing"
                className="text-gray-700 hover:text-blue-600 block px-3 py-2 text-base font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-md"
                onClick={() => setIsMenuOpen(false)}
              >
                Pricing
              </Link>
              <Link
                href="/about"
                className="text-gray-700 hover:text-blue-600 block px-3 py-2 text-base font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-md"
                onClick={() => setIsMenuOpen(false)}
              >
                About
              </Link>
              <Link
                href="/contact"
                className="text-gray-700 hover:text-blue-600 block px-3 py-2 text-base font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-md"
                onClick={() => setIsMenuOpen(false)}
              >
                Contact
              </Link>

              {!loading && (
                <>
                  {user ? (
                    <>
                      <Link
                        href="/dashboard"
                        className="text-gray-700 hover:text-blue-600 block px-3 py-2 text-base font-medium flex items-center focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-md"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        <User className="h-4 w-4 mr-2" aria-hidden="true" />
                        Dashboard
                      </Link>
                      <button
                        onClick={() => {
                          signOut();
                          setIsMenuOpen(false);
                        }}
                        className="text-gray-700 hover:text-blue-600 block w-full px-3 py-2 text-base font-medium text-left flex items-center focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-md"
                        aria-label="Log out of your account"
                      >
                        <LogOut className="h-4 w-4 mr-2" aria-hidden="true" />
                        Logout
                      </button>
                    </>
                  ) : (
                    <>
                      <Link
                        href="/login"
                        className="text-gray-700 hover:text-blue-600 block px-3 py-2 text-base font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-md"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        Login
                      </Link>
                      <Link
                        href="/signup"
                        className="bg-blue-600 text-white hover:bg-blue-700 block px-3 py-2 rounded-md text-base font-medium mx-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        Sign Up
                      </Link>
                    </>
                  )}
                </>
              )}
            </div>
          </nav>
        )}
      </div>
    </header>
  );
}
