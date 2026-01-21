import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Users, Shield, CheckCircle, Clock } from 'lucide-react'
import { AdminQueueWrapper } from './components/admin-queue-wrapper'

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

  // Fetch pending cleaners with completed onboarding
  const { data: pendingCleaners } = await supabase
    .from('cleaners')
    .select(`
      *,
      user:users(
        id,
        email,
        full_name,
        display_name,
        phone,
        city,
        state,
        zip_code
      )
    `)
    .neq('approval_status', 'approved')
    .order('onboarding_completed_at', { ascending: true, nullsFirst: false })

  // Fetch all users
  const { data: allUsers } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50)

  // Get stats
  const { count: totalUsers } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })

  const { count: totalCleaners } = await supabase
    .from('cleaners')
    .select('*', { count: 'exact', head: true })
    .eq('approval_status', 'approved')

  const { count: pendingApprovals } = await supabase
    .from('cleaners')
    .select('*', { count: 'exact', head: true })
    .eq('approval_status', 'pending')
    .not('onboarding_completed_at', 'is', null)

  const { count: rejectedCount } = await supabase
    .from('cleaners')
    .select('*', { count: 'exact', head: true })
    .eq('approval_status', 'rejected')

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Manage platform users and cleaner approvals
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUsers || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Cleaners</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCleaners || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingApprovals || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
            <Shield className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{rejectedCount || 0}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="approvals" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
          <TabsTrigger value="approvals" className="gap-2">
            <Clock className="h-4 w-4" />
            Approval Queue
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
              <AdminQueueWrapper applications={pendingCleaners || []} />
            </CardContent>
          </Card>
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
              {!allUsers || allUsers.length === 0 ? (
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
                      {allUsers.map((user) => (
                        <tr key={user.id} className="border-b">
                          <td className="p-2 text-sm">{user.email}</td>
                          <td className="p-2 text-sm">{user.display_name || user.full_name || '-'}</td>
                          <td className="p-2">
                            <Badge variant={
                              user.role === 'admin' ? 'default' :
                              user.role === 'cleaner' ? 'secondary' :
                              'outline'
                            }>
                              {user.role}
                            </Badge>
                          </td>
                          <td className="p-2 text-sm">
                            {user.city ? `${user.city}, ${user.state}` : '-'}
                          </td>
                          <td className="p-2 text-sm">
                            {new Date(user.created_at).toLocaleDateString()}
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
