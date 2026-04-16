'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/lib/context/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Mail, CheckCircle, Eye, EyeOff } from 'lucide-react'
import { resendVerificationEmail, canResendEmail, markEmailResent, getResendCooldownRemaining } from '@/lib/email/verification'
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton'

interface AuthFormProps {
  mode: 'login' | 'signup'
  role?: 'customer' | 'cleaner'
}

export function AuthForm({ mode, role = 'customer' }: AuthFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [phone, setPhone] = useState('')
  const [zipCode, setZipCode] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [verificationPending, setVerificationPending] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [resendSuccess, setResendSuccess] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const router = useRouter()
  const supabase = createClient()
  const isCleaner = mode === 'signup' && role === 'cleaner'
  const { user: authUser, loading: authLoading, roleLoaded, isAdmin, isCleaner: isCleanerRole } = useAuth()
  const [redirecting, setRedirecting] = useState(false)
  const safetyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // FIX 1: Redirect already-authenticated users away from login/signup
  useEffect(() => {
    if (authLoading || !authUser || !roleLoaded) return
    setRedirecting(true)
    if (isAdmin) router.push('/dashboard/admin')
    else if (isCleanerRole) router.push('/dashboard/pro')
    else router.push('/dashboard/customer')
  }, [authUser, authLoading, roleLoaded, isAdmin, isCleanerRole, router])

  // FIX 2: Safety timeout — force clear loading after 15s
  useEffect(() => {
    if (loading) {
      safetyTimeoutRef.current = setTimeout(() => {
        setLoading(false)
        setError('Something went wrong. Please try again.')
      }, 15000)
    } else {
      if (safetyTimeoutRef.current) {
        clearTimeout(safetyTimeoutRef.current)
        safetyTimeoutRef.current = null
      }
    }
    return () => {
      if (safetyTimeoutRef.current) clearTimeout(safetyTimeoutRef.current)
    }
  }, [loading])

  // Countdown timer for resend cooldown
  useEffect(() => {
    if (resendCooldown <= 0) return
    const timer = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1000) {
          clearInterval(timer)
          return 0
        }
        return prev - 1000
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [resendCooldown])

  const handleResendEmail = useCallback(async () => {
    if (!canResendEmail(email)) {
      setResendCooldown(getResendCooldownRemaining(email))
      return
    }

    setResendLoading(true)
    setResendSuccess(false)
    setError(null)

    const result = await resendVerificationEmail(email)

    if (result.success) {
      markEmailResent(email)
      setResendSuccess(true)
      setResendCooldown(60_000)
      setTimeout(() => setResendSuccess(false), 5000)
    } else {
      setError(result.error || 'Failed to resend verification email')
    }

    setResendLoading(false)
  }, [email])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      if (mode === 'signup') {
        const { data: authData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
            data: {
              role,
              full_name: fullName || undefined,
              business_name: businessName || undefined,
            },
          },
        })

        if (signUpError) throw signUpError

        // Check for repeated signup (user already exists but Supabase doesn't reveal this for security)
        if (authData.user && (!authData.user.identities || authData.user.identities.length === 0)) {
          setError('An account with this email already exists. Please sign in instead.')
          setLoading(false)
          return
        }

        if (authData.user) {
          // The handle_new_user DB trigger creates the users row automatically.
          // Update it with additional fields the trigger doesn't have.
          await supabase
            .from('users')
            .update({
              full_name: fullName || null,
              phone: phone || null,
              updated_at: new Date().toISOString(),
            })
            .eq('id', authData.user.id)

          // If cleaner, update the trigger-created cleaners profile with form data
          if (role === 'cleaner') {
            // Wait a moment for trigger to complete, then update with full details
            const { data: cleanerData } = await supabase
              .from('cleaners')
              .select('id')
              .eq('user_id', authData.user.id)
              .single()

            if (cleanerData) {
              // Update with business details from the signup form
              await supabase
                .from('cleaners')
                .update({
                  business_name: businessName || fullName || email.split('@')[0],
                })
                .eq('id', cleanerData.id)

              // Seed initial service area if zip provided
              if (zipCode) {
                const { data: zipData } = await supabase
                  .from('florida_zipcodes')
                  .select('city, county')
                  .eq('zip_code', zipCode)
                  .single()

                if (zipData) {
                  await supabase
                    .from('service_areas')
                    .insert({
                      cleaner_id: cleanerData.id,
                      zip_code: zipCode,
                      city: zipData.city,
                      county: zipData.county,
                      is_primary: true,
                    })
                }
              }
            } else {
              // Fallback: trigger may not have fired yet, create cleaner profile directly
              const { data: newCleaner, error: cleanerError } = await supabase
                .from('cleaners')
                .insert({
                  user_id: authData.user.id,
                  business_name: businessName || fullName || email.split('@')[0],
                  approval_status: 'pending',
                })
                .select('id')
                .single()

              if (!cleanerError && newCleaner && zipCode) {
                const { data: zipData } = await supabase
                  .from('florida_zipcodes')
                  .select('city, county')
                  .eq('zip_code', zipCode)
                  .single()

                if (zipData) {
                  await supabase
                    .from('service_areas')
                    .insert({
                      cleaner_id: newCleaner.id,
                      zip_code: zipCode,
                      city: zipData.city,
                      county: zipData.county,
                      is_primary: true,
                    })
                }
              }
            }
          }
          // Notify admin of new signup (fire and forget - don't block signup flow)
          fetch('/api/admin/signup-notification', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email,
              fullName: fullName || undefined,
              role,
              businessName: businessName || undefined,
              phone: phone || undefined,
              zipCode: zipCode || undefined,
            }),
          }).catch(() => {
            // Silently fail - don't break signup if notification fails
          })
        }

        // Check if email confirmation is required
        if (authData.user && !authData.session) {
          markEmailResent(email)
          setResendCooldown(60_000)
          setVerificationPending(true)
          setLoading(false)
          return
        }

        router.push(role === 'cleaner' ? '/dashboard/pro/setup' : '/dashboard/customer')
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (signInError) throw signInError

        // Let middleware determine the correct dashboard based on role
        router.push('/dashboard')
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An error occurred during authentication';

      // Provide user-friendly error messages
      if (message.includes('Invalid login credentials')) {
        setError('Incorrect email or password. Please try again or use "Forgot password?" to reset.');
      } else if (message.includes('Email not confirmed')) {
        setError('Your email hasn\'t been verified yet. Please check your inbox for the verification link, or sign up again to resend it.');
      } else if (message.includes('rate') || message.includes('429')) {
        setError('Too many login attempts. Please wait a few minutes and try again.');
      } else {
        setError(message);
      }
    } finally {
      setLoading(false)
    }
  }

  // Show redirecting state for already-authenticated users
  if (redirecting) {
    return (
      <Card className="w-full max-w-md">
        <CardContent className="py-12 text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Redirecting to your dashboard...</p>
        </CardContent>
      </Card>
    )
  }

  if (verificationPending) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 rounded-full bg-blue-100 p-3 w-fit">
            <Mail className="h-8 w-8 text-blue-600" />
          </div>
          <CardTitle>Verify Your Email</CardTitle>
          <CardDescription>
            We sent a verification link to <strong>{email}</strong>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground text-center">
            Click the link in your email to verify your account. The link expires after 24 hours.
          </p>

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {resendSuccess && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>Verification email resent successfully!</AlertDescription>
            </Alert>
          )}
        </CardContent>
        <CardFooter className="flex flex-col space-y-3">
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleResendEmail}
            disabled={resendLoading || resendCooldown > 0}
          >
            {resendLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {resendCooldown > 0
              ? `Resend in ${Math.ceil(resendCooldown / 1000)}s`
              : 'Resend Verification Email'}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Wrong email?{' '}
            <button
              type="button"
              onClick={() => {
                setVerificationPending(false)
                setError(null)
                setResendSuccess(false)
              }}
              className="text-primary hover:underline"
            >
              Try again
            </button>
          </p>
        </CardFooter>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="flex flex-col items-center mb-4">
          <Image
            src="/boss-of-clean-logo.png"
            alt="Boss of Clean"
            width={80}
            height={80}
            className="rounded-full"
          />
          <h1 className="text-2xl font-bold mt-3">Boss of Clean</h1>
          <p className="text-gray-500 text-sm">Purrfection is our Standard</p>
        </div>
        <CardTitle>{mode === 'login' ? 'Sign In' : isCleaner ? 'Pro Account' : 'Create Account'}</CardTitle>
        <CardDescription>
          {mode === 'login'
            ? 'Enter your email and password to access your account'
            : isCleaner
              ? 'Set up your professional cleaning account'
              : 'Sign up to find professional cleaners in your area'}
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {mode === 'signup' && (
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <Input
                id="fullName"
                type="text"
                placeholder="John Smith"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                disabled={loading}
              />
            </div>
          )}

          {isCleaner && (
            <>
              <div className="space-y-2">
                <Label htmlFor="businessName">Business Name</Label>
                <Input
                  id="businessName"
                  type="text"
                  placeholder="Smith's Cleaning Services"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="(407) 555-0123"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zipCode">Zip Code</Label>
                  <Input
                    id="zipCode"
                    type="text"
                    placeholder="32801"
                    value={zipCode}
                    onChange={(e) => setZipCode(e.target.value)}
                    required
                    disabled={loading}
                    maxLength={5}
                    pattern="[0-9]{5}"
                  />
                </div>
              </div>
            </>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              {mode === 'login' && (
                <a
                  href="/forgot-password"
                  className="text-sm text-primary hover:underline"
                >
                  Forgot password?
                </a>
              )}
            </div>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                minLength={6}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                tabIndex={-1}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </CardContent>

        <CardFooter className="flex flex-col space-y-4">
          <Button
            type="submit"
            className="w-full"
            disabled={loading}
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {mode === 'login' ? 'Sign In' : isCleaner ? 'Create Pro Account' : 'Sign Up'}
          </Button>

          {isCleaner && (
            <p className="text-xs text-center text-muted-foreground">
              You&apos;ll complete your full profile after signup
            </p>
          )}

          <div className="relative w-full">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
            </div>
          </div>

          <GoogleSignInButton
            mode={mode}
            role={role}
            disabled={loading}
            onError={setError}
          />

          <p className="text-center text-sm text-muted-foreground">
            {mode === 'login' ? (
              <>
                Don&apos;t have an account?{' '}
                <a href="/signup" className="text-primary hover:underline">
                  Sign up
                </a>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <a href="/login" className="text-primary hover:underline">
                  Sign in
                </a>
              </>
            )}
          </p>
        </CardFooter>
      </form>
    </Card>
  )
}
