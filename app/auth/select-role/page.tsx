'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, User, Briefcase } from 'lucide-react'

export default function SelectRolePage() {
  const [loading, setLoading] = useState(false)
  const [selectedRole, setSelectedRole] = useState<'customer' | 'cleaner' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [checkingAuth, setCheckingAuth] = useState(true)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      // Check if user already has a role set
      const { data: userData } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single()

      if (userData?.role) {
        // User already has a role, redirect to dashboard
        router.push(`/dashboard/${userData.role}`)
        return
      }

      setCheckingAuth(false)
    }

    checkAuth()
  }, [router, supabase])

  const handleRoleSelection = async () => {
    if (!selectedRole) return

    setLoading(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        throw new Error('No authenticated user found')
      }

      // Update user role
      const { error: updateError } = await supabase
        .from('users')
        .update({
          role: selectedRole,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)

      if (updateError) throw updateError

      // If cleaner role, create cleaner profile entry
      if (selectedRole === 'cleaner') {
        const { error: cleanerError } = await supabase
          .from('cleaners')
          .insert({
            user_id: user.id,
            business_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'My Cleaning Business',
            approval_status: 'pending',
          })

        if (cleanerError && cleanerError.code !== '23505') {
          // Ignore duplicate key errors
          console.error('Error creating cleaner profile:', cleanerError)
        }
      }

      // Redirect to appropriate dashboard
      if (selectedRole === 'cleaner') {
        router.push('/dashboard/cleaner/setup')
      } else {
        router.push('/dashboard/customer')
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to set role'
      setError(message)
      setLoading(false)
    }
  }

  if (checkingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Welcome to Boss of Clean!</CardTitle>
          <CardDescription>
            How would you like to use Boss of Clean?
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="grid gap-4">
            <button
              type="button"
              onClick={() => setSelectedRole('customer')}
              disabled={loading}
              className={`flex items-center gap-4 p-4 rounded-lg border-2 transition-colors ${
                selectedRole === 'customer'
                  ? 'border-primary bg-primary/5'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className={`rounded-full p-3 ${
                selectedRole === 'customer' ? 'bg-primary/10' : 'bg-gray-100'
              }`}>
                <User className={`h-6 w-6 ${
                  selectedRole === 'customer' ? 'text-primary' : 'text-gray-500'
                }`} />
              </div>
              <div className="text-left">
                <h3 className="font-semibold">I need cleaning services</h3>
                <p className="text-sm text-muted-foreground">
                  Find and hire professional cleaners in your area
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setSelectedRole('cleaner')}
              disabled={loading}
              className={`flex items-center gap-4 p-4 rounded-lg border-2 transition-colors ${
                selectedRole === 'cleaner'
                  ? 'border-primary bg-primary/5'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className={`rounded-full p-3 ${
                selectedRole === 'cleaner' ? 'bg-primary/10' : 'bg-gray-100'
              }`}>
                <Briefcase className={`h-6 w-6 ${
                  selectedRole === 'cleaner' ? 'text-primary' : 'text-gray-500'
                }`} />
              </div>
              <div className="text-left">
                <h3 className="font-semibold">I offer cleaning services</h3>
                <p className="text-sm text-muted-foreground">
                  List your business and get customers
                </p>
              </div>
            </button>
          </div>

          <Button
            onClick={handleRoleSelection}
            disabled={!selectedRole || loading}
            className="w-full"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Continue
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
