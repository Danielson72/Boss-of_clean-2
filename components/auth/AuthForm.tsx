'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Mail, CheckCircle } from 'lucide-react'
import { resendVerificationEmail, canResendEmail, markEmailResent, getResendCooldownRemaining } from '@/lib/email/verification'

interface AuthFormProps {
  mode: 'login' | 'signup'
}

export function AuthForm({ mode }: AuthFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [verificationPending, setVerificationPending] = useState(false)
  const [resendLoading, setResendLoading] = useState(false)
  const [resendSuccess, setResendSuccess] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const router = useRouter()
  const supabase = createClient()

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
          },
        })

        if (signUpError) throw signUpError

        if (authData.user) {
          // Create user record in public.users table if it doesn't exist
          const { error: userError } = await supabase
            .from('users')
            .upsert({
              id: authData.user.id,
              email: authData.user.email,
              role: 'customer', // Default role for new signups
              created_at: new Date().toISOString(),
            }, {
              onConflict: 'id'
            })

          if (userError) {
            console.error('Error creating user record:', userError)
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

        router.push('/dashboard/customer')
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
        router.push(`/dashboard/${role}`)
      }
    } catch (error: any) {
      setError(error.message || 'An error occurred during authentication')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setLoading(true)
    setError(null)

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) throw error
    } catch (error: any) {
      setError(error.message || 'An error occurred during Google sign-in')
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
      <CardHeader>
        <CardTitle>{mode === 'login' ? 'Sign In' : 'Create Account'}</CardTitle>
        <CardDescription>
          {mode === 'login' 
            ? 'Enter your email and password to access your account'
            : 'Sign up to start finding or offering cleaning services'}
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
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
            <Label htmlFor="password">Password</Label>
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
            {mode === 'login' ? 'Sign In' : 'Sign Up'}
          </Button>
          
          <div className="relative w-full">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
            </div>
          </div>
          
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={handleGoogleSignIn}
            disabled={loading}
          >
            <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Google
          </Button>
          
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