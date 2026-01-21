'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Menu, X, Search, Phone, Mail, User, LogOut } from 'lucide-react';
import { useAuth } from '@/lib/context/AuthContext';

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, signOut, loading } = useAuth();

  return (
    <header className="bg-white shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex-shrink-0">
            <div className="text-2xl font-bold text-blue-600">
              BOSS OF CLEAN
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex space-x-8">
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
                      <User className="h-4 w-4 mr-1" />
                      Dashboard
                    </Link>
                    <button 
                      onClick={signOut}
                      className="text-gray-700 hover:text-blue-600 px-3 py-2 text-sm font-medium flex items-center"
                    >
                      <LogOut className="h-4 w-4 mr-1" />
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
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:text-blue-600 hover:bg-gray-100"
          >
            {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-white border-t">
              <Link
                href="/"
                className="text-gray-700 hover:text-blue-600 block px-3 py-2 text-base font-medium"
                onClick={() => setIsMenuOpen(false)}
              >
                Home
              </Link>
              <Link
                href="/search"
                className="text-gray-700 hover:text-blue-600 block px-3 py-2 text-base font-medium"
                onClick={() => setIsMenuOpen(false)}
              >
                Search
              </Link>
              <Link
                href="/pricing"
                className="text-gray-700 hover:text-blue-600 block px-3 py-2 text-base font-medium"
                onClick={() => setIsMenuOpen(false)}
              >
                Pricing
              </Link>
              <Link
                href="/about"
                className="text-gray-700 hover:text-blue-600 block px-3 py-2 text-base font-medium"
                onClick={() => setIsMenuOpen(false)}
              >
                About
              </Link>
              <Link
                href="/contact"
                className="text-gray-700 hover:text-blue-600 block px-3 py-2 text-base font-medium"
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
                        className="text-gray-700 hover:text-blue-600 block px-3 py-2 text-base font-medium flex items-center"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        <User className="h-4 w-4 mr-2" />
                        Dashboard
                      </Link>
                      <button 
                        onClick={() => {
                          signOut();
                          setIsMenuOpen(false);
                        }}
                        className="text-gray-700 hover:text-blue-600 block px-3 py-2 text-base font-medium text-left flex items-center"
                      >
                        <LogOut className="h-4 w-4 mr-2" />
                        Logout
                      </button>
                    </>
                  ) : (
                    <>
                      <Link
                        href="/login"
                        className="text-gray-700 hover:text-blue-600 block px-3 py-2 text-base font-medium"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        Login
                      </Link>
                      <Link
                        href="/signup"
                        className="bg-blue-600 text-white hover:bg-blue-700 block px-3 py-2 rounded-md text-base font-medium mx-3"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        Sign Up
                      </Link>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}