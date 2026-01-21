'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/context/AuthContext';
import { Menu, X, User, LogOut, Settings, Home, Search } from 'lucide-react';
// NEW: Import UserNav for Supabase auth integration
import UserNav from '@/components/auth/UserNav';

export default function Navigation() {
  const { user, isCustomer, isCleaner, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    window.location.href = '/';
  };

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center">
              <span className="text-2xl font-bold">
                <span className="text-blue-600">BOSS</span> OF <span className="text-blue-600">CLEAN</span>
              </span>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link href="/" className="text-gray-700 hover:text-blue-600 transition duration-300">
              Home
            </Link>
            <Link href="/search" className="text-gray-700 hover:text-blue-600 transition duration-300">
              Find Cleaners
            </Link>
            <Link href="/pricing" className="text-gray-700 hover:text-blue-600 transition duration-300">
              Pricing
            </Link>
            <Link href="/about" className="text-gray-700 hover:text-blue-600 transition duration-300">
              About
            </Link>
            
            {/* NEW: Supabase auth integration with UserNav */}
            <UserNav />
            
            {/* OLD: AuthContext-based UI (commented out)
            {user ? (
              <div className="flex items-center space-x-4">
                <Link
                  href="/dashboard"
                  className="flex items-center gap-2 text-gray-700 hover:text-blue-600 transition duration-300"
                >
                  <User className="h-5 w-5" />
                  Dashboard
                </Link>
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-2 text-gray-700 hover:text-red-600 transition duration-300"
                >
                  <LogOut className="h-5 w-5" />
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <Link
                  href="/login"
                  className="text-gray-700 hover:text-blue-600 transition duration-300"
                >
                  Sign In
                </Link>
                <Link
                  href="/signup"
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition duration-300"
                >
                  Sign Up
                </Link>
              </div>
            )}
            */}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-gray-700 hover:text-blue-600 transition duration-300"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t">
          <div className="px-2 pt-2 pb-3 space-y-1">
            <Link
              href="/"
              className="block px-3 py-2 text-gray-700 hover:text-blue-600 hover:bg-gray-50 rounded-md transition duration-300"
            >
              Home
            </Link>
            <Link
              href="/search"
              className="block px-3 py-2 text-gray-700 hover:text-blue-600 hover:bg-gray-50 rounded-md transition duration-300"
            >
              Find Cleaners
            </Link>
            <Link
              href="/pricing"
              className="block px-3 py-2 text-gray-700 hover:text-blue-600 hover:bg-gray-50 rounded-md transition duration-300"
            >
              Pricing
            </Link>
            <Link
              href="/about"
              className="block px-3 py-2 text-gray-700 hover:text-blue-600 hover:bg-gray-50 rounded-md transition duration-300"
            >
              About
            </Link>
            
            {/* NEW: Mobile auth links for Supabase */}
            <Link
              href="/login"
              className="block px-3 py-2 text-gray-700 hover:text-blue-600 hover:bg-gray-50 rounded-md transition duration-300"
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="block px-3 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-md transition duration-300 text-center"
            >
              Sign Up
            </Link>
            
            {/* OLD: AuthContext-based mobile UI (commented out)
            {user ? (
              <>
                <Link
                  href="/dashboard"
                  className="block px-3 py-2 text-gray-700 hover:text-blue-600 hover:bg-gray-50 rounded-md transition duration-300"
                >
                  Dashboard
                </Link>
                <button
                  onClick={handleSignOut}
                  className="w-full text-left px-3 py-2 text-gray-700 hover:text-red-600 hover:bg-gray-50 rounded-md transition duration-300"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="block px-3 py-2 text-gray-700 hover:text-blue-600 hover:bg-gray-50 rounded-md transition duration-300"
                >
                  Sign In
                </Link>
                <Link
                  href="/signup"
                  className="block px-3 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-md transition duration-300 text-center"
                >
                  Sign Up
                </Link>
              </>
            )}
            */}
          </div>
        </div>
      )}
    </nav>
  );
}