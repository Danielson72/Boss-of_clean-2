import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Users, Shield, CheckCircle, Clock, BarChart3, DollarSign, AlertTriangle } from 'lucide-react'
import { AdminQueueWrapper } from './components/admin-queue-wrapper'
import { PaymentMonitoring } from './components/PaymentMonitoring'
import { getPaymentMonitoringData } from '@/lib/services/admin-payments'

export default async function AdminDashboard() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Verify admin role
  const { data: userData } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (userData?.role !== 'admin') {
    redirect('/dashboard/customer')
  }

  // Wrap ALL data fetching in try/catch — server component errors in Next.js 13
  // bypass error.tsx and render a blank page, so we must never throw.
  let pendingCleaners: unknown[] = []
  let allUsers: Record<string, unknown>[] = []
  let totalUsers = 0
  let totalCleaners = 0
  let pendingApprovals = 0
  let rejectedCount = 0
  let paymentData = null
  let dataError: string | null = null

  try {
    // Fetch pending cleaners with completed onboarding
    const { data: cleanersData, error: cleanersError } = await supabase
      .from('cleaners')
      .select(`
        *,
        user:users(
          id,
          email,
          full_name,
          phone,
          city,
          state,
          zip_code
        )
      `)
      .neq('approval_status', 'approved')
      .order('created_at', { ascending: false })

    if (cleanersError) {
      console.error('[admin] cleaners query error:', cleanersError.message)
    }
    pendingCleaners = cleanersData || []

    // Fetch all users
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)

    if (usersError) {
      console.error('[admin] users query error:', usersError.message)
    }
    allUsers = (usersData || []) as Record<string, unknown>[]

    // Get stats — each in its own error-safe block
    const [statsUsers, statsCleaners, statsPending, statsRejected] = await Promise.all([
      supabase.from('users').select('*', { count: 'exact', head: true }),
      supabase.from('cleaners').select('*', { count: 'exact', head: true }).eq('approval_status', 'approved'),
      supabase.from('cleaners').select('*', { count: 'exact', head: true }).eq('approval_status', 'pending'),
      supabase.from('cleaners').select('*', { count: 'exact', head: true }).eq('approval_status', 'rejected'),
    ])

    totalUsers = statsUsers.count || 0
    totalCleaners = statsCleaners.count || 0
    pendingApprovals = statsPending.count || 0
    rejectedCount = statsRejected.count || 0
  } catch (err) {
    console.error('[admin] Data fetch error:', err)
    dataError = err instanceof Error ? err.message : 'Failed to load dashboard data'
  }

  // Payment monitoring is completely independent
  try {
    paymentData = await getPaymentMonitoringData()
  } catch (err) {
    console.error('[admin] Payment monitoring error:', err)
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Manage platform users and cleaner approvals
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/admin/analytics">
            <BarChart3 className="h-4 w-4 mr-2" />
            View Analytics
          </Link>
        </Button>
      </div>

      {dataError && (
        <Card className="mb-8 border-yellow-500">
          <CardContent className="py-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0" />
            <div>
              <p className="font-medium text-yellow-800">Some data failed to load</p>
              <p className="text-sm text-yellow-600">{dataError}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUsers}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Cleaners</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCleaners}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingApprovals}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
            <Shield className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rejectedCount}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="approvals" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:w-[600px]">
          <TabsTrigger value="approvals" className="gap-2">
            <Clock className="h-4 w-4" />
            Approval Queue
          </TabsTrigger>
          <TabsTrigger value="payments" className="gap-2">
            <DollarSign className="h-4 w-4" />
            Payments
          </TabsTrigger>
          <TabsTrigger value="users" className="gap-2">
            <Users className="h-4 w-4" />
            Users
          </TabsTrigger>
        </TabsList>

        <TabsContent value="approvals" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Pending Cleaner Applications</CardTitle>
              <CardDescription>
                Review and approve cleaner profiles. Applications with info requests are highlighted.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AdminQueueWrapper applications={pendingCleaners as never[]} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
          {paymentData ? (
            <PaymentMonitoring data={paymentData} />
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                <DollarSign className="mx-auto h-12 w-12 mb-4 opacity-50" />
                <p>Payment monitoring data unavailable</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>
                View and manage platform users
              </CardDescription>
            </CardHeader>
            <CardContent>
              {allUsers.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    No users found
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Email</th>
                        <th className="text-left p-2">Name</th>
                        <th className="text-left p-2">Role</th>
                        <th className="text-left p-2">Location</th>
                        <th className="text-left p-2">Joined</th>
                        <th className="text-left p-2">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allUsers.map((u) => (
                        <tr key={String(u.id)} className="border-b">
                          <td className="p-2 text-sm">{String(u.email || '')}</td>
                          <td className="p-2 text-sm">{String(u.full_name || '-')}</td>
                          <td className="p-2">
                            <Badge variant={
                              u.role === 'admin' ? 'default' :
                              u.role === 'cleaner' ? 'secondary' :
                              'outline'
                            }>
                              {String(u.role || 'unknown')}
                            </Badge>
                          </td>
                          <td className="p-2 text-sm">
                            {u.city ? `${u.city}, ${u.state}` : '-'}
                          </td>
                          <td className="p-2 text-sm">
                            {u.created_at ? new Date(String(u.created_at)).toLocaleDateString() : '-'}
                          </td>
                          <td className="p-2">
                            <Button size="sm" variant="ghost">
                              View
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export const metadata = {
  title: 'Admin Dashboard | Boss of Clean',
  description: 'Platform administration',
}
