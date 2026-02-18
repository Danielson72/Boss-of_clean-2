'use client'

import { useState } from 'react'
import Image from 'next/image'
import { User, Briefcase, ArrowLeft } from 'lucide-react'
import { AuthForm } from '@/components/auth/AuthForm'

type SignupRole = 'customer' | 'cleaner'

export default function SignupPage() {
  const [selectedRole, setSelectedRole] = useState<SignupRole | null>(null)

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="flex flex-col items-center w-full max-w-md">
        <Image
          src="/boss-of-clean-logo.png"
          alt="Boss of Clean"
          width={80}
          height={80}
          className="rounded-lg mb-6"
          priority
        />

        {selectedRole === null ? (
          <div className="w-full space-y-6">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-900">Join Boss of Clean</h1>
              <p className="mt-2 text-sm text-gray-600">
                Choose how you&apos;d like to use the platform
              </p>
            </div>

            <div className="grid gap-4">
              <button
                type="button"
                onClick={() => setSelectedRole('customer')}
                className="flex items-center gap-4 p-5 rounded-xl border-2 border-gray-200 bg-white hover:border-blue-400 hover:bg-blue-50/50 transition-all text-left group"
              >
                <div className="rounded-full p-3 bg-blue-100 group-hover:bg-blue-200 transition-colors">
                  <User className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">I Need Cleaning</h3>
                  <p className="text-sm text-gray-500 mt-0.5">
                    Find and hire professional cleaners in your area
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedRole('cleaner')}
                className="flex items-center gap-4 p-5 rounded-xl border-2 border-gray-200 bg-white hover:border-emerald-400 hover:bg-emerald-50/50 transition-all text-left group"
              >
                <div className="rounded-full p-3 bg-emerald-100 group-hover:bg-emerald-200 transition-colors">
                  <Briefcase className="h-6 w-6 text-emerald-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">I&apos;m a Cleaning Pro</h3>
                  <p className="text-sm text-gray-500 mt-0.5">
                    Grow your business and get new customers
                  </p>
                </div>
              </button>
            </div>

            <p className="text-center text-sm text-gray-500">
              Already have an account?{' '}
              <a href="/login" className="text-blue-600 hover:underline font-medium">
                Sign in
              </a>
            </p>
          </div>
        ) : (
          <div className="w-full">
            <button
              type="button"
              onClick={() => setSelectedRole(null)}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Change role
            </button>
            <AuthForm mode="signup" role={selectedRole} />
          </div>
        )}
      </div>
    </div>
  )
}
