'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { roleToDashboardPath } from '@/lib/utils/dashboard-path'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Mail, CheckCircle } from 'lucide-react'
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
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [verificationPending, setVerificationPending] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [resendSuccess, setResendSuccess] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const router = useRouter()
  const supabase = createClient()
  const isCleaner = mode === 'signup' && role === 'cleaner'

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
            },
          },
        })

        if (signUpError) throw signUpError

        if (authData.user) {
          // Create user record in public.users table
          const { error: userError } = await supabase
            .from('users')
            .upsert({
              id: authData.user.id,
              email: authData.user.email,
              full_name: fullName || null,
              phone: phone || null,
              role,
              created_at: new Date().toISOString(),
            }, {
              onConflict: 'id'
            })

          if (userError) {
            // Error creating user record - silently fail for client component
          }

          // If cleaner, create cleaner profile
          if (role === 'cleaner') {
            const { error: cleanerError } = await supabase
              .from('cleaners')
              .insert({
                user_id: authData.user.id,
                business_name: businessName || fullName || email.split('@')[0],
                approval_status: 'pending',
              })

            if (cleanerError && cleanerError.code !== '23505') {
              // Ignore duplicate key errors
            }

            // Seed initial service area if zip provided
            if (zipCode) {
              const { data: zipData } = await supabase
                .from('florida_zipcodes')
                .select('city, county')
                .eq('zip_code', zipCode)
                .single()

              if (zipData) {
                const { data: cleanerData } = await supabase
                  .from('cleaners')
                  .select('id')
                  .eq('user_id', authData.user.id)
                  .single()

                if (cleanerData) {
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
            }
          }
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

        // Get user role and redirect accordingly
        const { data: userData } = await supabase
          .from('users')
          .select('role')
          .eq('email', email)
          .single()

        const role = userData?.role || 'customer'
        router.push(roleToDashboardPath(role))
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An error occurred during authentication';
      setError(message);
    } finally {
      setLoading(false)
    }
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
          
          {isCleaner && (
            <>
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
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              minLength={6}
            />
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
            disabled={loading}
            onError={setError}
          />
          
          <p className="text-center text-sm text-muted-foreground">
            {mode === 'login' ? (
              <>
                Don't have an account?{' '}
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