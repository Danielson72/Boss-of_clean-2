import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Users, Shield, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react'

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

  // Fetch pending cleaners
  const { data: pendingCleaners } = await supabase
    .from('cleaners')
    .select(`
      *,
      user:users(
        email,
        display_name,
        city,
        state,
        zip_code
      )
    `)
    .neq('approval_status', 'approved')
    .order('created_at', { ascending: false })

  // Fetch all users
  const { data: allUsers } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20)

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
            <CardTitle className="text-sm font-medium">Platform Status</CardTitle>
            <Shield className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Active</div>
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
                Review and approve cleaner profiles
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!pendingCleaners || pendingCleaners.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="mx-auto h-12 w-12 text-green-600 mb-4" />
                  <p className="text-muted-foreground">
                    No pending applications
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingCleaners.map((cleaner) => (
                    <Card key={cleaner.id}>
                      <CardContent className="pt-6">
                        <div className="flex justify-between items-start">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold">{cleaner.business_name}</h3>
                              <Badge variant={
                                cleaner.approval_status === 'pending' ? 'secondary' : 'destructive'
                              }>
                                {cleaner.approval_status}
                              </Badge>
                            </div>
                            
                            <div className="text-sm text-muted-foreground space-y-1">
                              <p>Contact: {cleaner.user?.email}</p>
                              <p>Location: {cleaner.user?.city}, {cleaner.user?.state} {cleaner.user?.zip_code}</p>
                              <p>Experience: {cleaner.years_experience} years</p>
                              <p>Rate: ${cleaner.hourly_rate}/hour</p>
                              <p>Applied: {new Date(cleaner.created_at).toLocaleDateString()}</p>
                            </div>

                            {cleaner.description && (
                              <div className="mt-2">
                                <p className="text-sm font-medium">Description:</p>
                                <p className="text-sm text-muted-foreground">{cleaner.description}</p>
                              </div>
                            )}

                            <div className="flex gap-2 mt-2">
                              {cleaner.insurance_verified && (
                                <Badge variant="outline" className="text-green-600">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Insurance Verified
                                </Badge>
                              )}
                              {cleaner.background_checked && (
                                <Badge variant="outline" className="text-blue-600">
                                  <Shield className="h-3 w-3 mr-1" />
                                  Background Checked
                                </Badge>
                              )}
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="default"
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
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