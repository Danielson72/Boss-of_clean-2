import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Briefcase,
  ClipboardList,
  Star,
  AlertTriangle,
} from 'lucide-react'

export const metadata = {
  title: 'User Detail | Admin | Boss of Clean',
  description: 'Admin user detail',
}

interface UserDetailPageProps {
  params: { id: string }
}

type UserRow = {
  id: string
  email: string | null
  full_name: string | null
  phone: string | null
  role: string | null
  avatar_url: string | null
  address: string | null
  city: string | null
  state: string | null
  zip_code: string | null
  created_at: string | null
  updated_at: string | null
  subscription_tier: string | null
  subscription_expires_at: string | null
}

type ProRow = {
  id: string
  business_name: string | null
  approval_status: string | null
  primary_category: string | null
  subscription_tier: string | null
  subscription_status: string | null
  total_jobs: number | null
  total_reviews: number | null
  average_rating: number | null
  monthly_accepted_lead_count: number | null
  created_at: string | null
}

function formatDate(value: string | null): string {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleString('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  } catch {
    return value
  }
}

function formatRole(role: string | null): string {
  if (!role) return 'unknown'
  if (role === 'cleaner') return 'pro'
  return role
}

export default async function AdminUserDetailPage({ params }: UserDetailPageProps) {
  const supabase = await createClient()

  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) {
    redirect('/login')
  }

  const { data: callerData } = await supabase
    .from('users')
    .select('role')
    .eq('id', authUser.id)
    .single()

  if (callerData?.role !== 'admin') {
    redirect('/dashboard/customer')
  }

  const { data: targetUser, error: targetError } = await supabase
    .from('users')
    .select('*')
    .eq('id', params.id)
    .maybeSingle<UserRow>()

  if (targetError) {
    console.error('[admin/users/[id]] users query error:', targetError.message)
  }

  if (!targetUser) {
    notFound()
  }

  let proRow: ProRow | null = null
  let quoteCount = 0
  let bookingCount = 0
  let reviewsGivenCount = 0
  let leadAcceptanceCount = 0

  if (targetUser.role === 'cleaner' || targetUser.role === 'pro') {
    const { data: proData, error: proError } = await supabase
      .from('pros')
      .select(
        'id, business_name, approval_status, primary_category, subscription_tier, subscription_status, total_jobs, total_reviews, average_rating, monthly_accepted_lead_count, created_at'
      )
      .eq('user_id', targetUser.id)
      .maybeSingle<ProRow>()

    if (proError) {
      console.error('[admin/users/[id]] pros query error:', proError.message)
    }
    proRow = proData ?? null

    if (proRow) {
      const [acceptedRes, reviewsRes] = await Promise.all([
        supabase
          .from('lead_acceptances')
          .select('*', { count: 'exact', head: true })
          .eq('cleaner_id', proRow.id),
        supabase
          .from('reviews')
          .select('*', { count: 'exact', head: true })
          .eq('cleaner_id', proRow.id),
      ])
      leadAcceptanceCount = acceptedRes.count ?? 0
      reviewsGivenCount = reviewsRes.count ?? 0
    }
  } else if (targetUser.role === 'customer') {
    const [quoteRes, bookingRes, reviewRes] = await Promise.all([
      supabase
        .from('quote_requests')
        .select('*', { count: 'exact', head: true })
        .eq('customer_id', targetUser.id),
      supabase
        .from('bookings')
        .select('*', { count: 'exact', head: true })
        .eq('customer_id', targetUser.id),
      supabase
        .from('reviews')
        .select('*', { count: 'exact', head: true })
        .eq('customer_id', targetUser.id),
    ])
    quoteCount = quoteRes.count ?? 0
    bookingCount = bookingRes.count ?? 0
    reviewsGivenCount = reviewRes.count ?? 0
  }

  const roleLabel = formatRole(targetUser.role)
  const locationLine = targetUser.city
    ? `${targetUser.city}${targetUser.state ? `, ${targetUser.state}` : ''}${
        targetUser.zip_code ? ` ${targetUser.zip_code}` : ''
      }`
    : '—'

  return (
    <div className="container mx-auto px-3 py-4 md:p-6 space-y-6">
      <div className="flex flex-col gap-3">
        <Button asChild variant="ghost" size="sm" className="w-fit -ml-2">
          <Link href="/dashboard/admin#users" className="flex items-center gap-1">
            <ArrowLeft className="h-4 w-4" />
            Back to User Management
          </Link>
        </Button>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">
              {targetUser.full_name || targetUser.email || 'Unnamed user'}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">User ID: {targetUser.id}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant={
                roleLabel === 'admin'
                  ? 'default'
                  : roleLabel === 'pro'
                  ? 'secondary'
                  : 'outline'
              }
            >
              {roleLabel}
            </Badge>
            {targetUser.subscription_tier && (
              <Badge variant="outline">{targetUser.subscription_tier}</Badge>
            )}
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Identity</CardTitle>
          <CardDescription>Core profile from public.users</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Field icon={<Mail className="h-4 w-4" />} label="Email" value={targetUser.email} />
          <Field icon={<Phone className="h-4 w-4" />} label="Phone" value={targetUser.phone} />
          <Field icon={<MapPin className="h-4 w-4" />} label="Location" value={locationLine} />
          <Field
            icon={<Calendar className="h-4 w-4" />}
            label="Joined"
            value={formatDate(targetUser.created_at)}
          />
          <Field
            icon={<Calendar className="h-4 w-4" />}
            label="Last updated"
            value={formatDate(targetUser.updated_at)}
          />
          <Field
            icon={<Briefcase className="h-4 w-4" />}
            label="Subscription"
            value={targetUser.subscription_tier ?? '—'}
          />
        </CardContent>
      </Card>

      {(targetUser.role === 'cleaner' || targetUser.role === 'pro') && (
        <Card>
          <CardHeader>
            <CardTitle>Pro profile</CardTitle>
            <CardDescription>From public.pros (linked by user_id)</CardDescription>
          </CardHeader>
          <CardContent>
            {proRow ? (
              <div className="grid gap-4 md:grid-cols-2">
                <Field
                  icon={<Briefcase className="h-4 w-4" />}
                  label="Business name"
                  value={proRow.business_name}
                />
                <Field
                  icon={<ClipboardList className="h-4 w-4" />}
                  label="Approval status"
                  value={proRow.approval_status}
                />
                <Field
                  icon={<ClipboardList className="h-4 w-4" />}
                  label="Primary category"
                  value={proRow.primary_category}
                />
                <Field
                  icon={<Briefcase className="h-4 w-4" />}
                  label="Subscription"
                  value={
                    proRow.subscription_tier
                      ? `${proRow.subscription_tier}${
                          proRow.subscription_status ? ` · ${proRow.subscription_status}` : ''
                        }`
                      : '—'
                  }
                />
                <Field
                  icon={<Star className="h-4 w-4" />}
                  label="Avg rating"
                  value={
                    proRow.average_rating != null
                      ? `${proRow.average_rating.toFixed(1)} (${proRow.total_reviews ?? 0} reviews)`
                      : '—'
                  }
                />
                <Field
                  icon={<ClipboardList className="h-4 w-4" />}
                  label="Total jobs"
                  value={String(proRow.total_jobs ?? 0)}
                />
                <Field
                  icon={<ClipboardList className="h-4 w-4" />}
                  label="Leads accepted (lifetime)"
                  value={String(leadAcceptanceCount)}
                />
                <Field
                  icon={<ClipboardList className="h-4 w-4" />}
                  label="Accepted leads (this period)"
                  value={String(proRow.monthly_accepted_lead_count ?? 0)}
                />
                <Field
                  icon={<Star className="h-4 w-4" />}
                  label="Reviews received"
                  value={String(reviewsGivenCount)}
                />
                <Field
                  icon={<Calendar className="h-4 w-4" />}
                  label="Pro since"
                  value={formatDate(proRow.created_at)}
                />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Role is &quot;{roleLabel}&quot; but no row found in public.pros for this user.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {targetUser.role === 'customer' && (
        <Card>
          <CardHeader>
            <CardTitle>Customer activity</CardTitle>
            <CardDescription>Aggregate counts across the platform</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <Stat label="Quote requests" value={quoteCount} />
            <Stat label="Bookings" value={bookingCount} />
            <Stat label="Reviews written" value={reviewsGivenCount} />
          </CardContent>
        </Card>
      )}

      {targetUser.role === 'admin' && (
        <Card>
          <CardHeader>
            <CardTitle>Admin account</CardTitle>
            <CardDescription>Platform staff — no customer activity expected.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Admin-only fields will appear here once we wire admin_actions audit history.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

function Field({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: string | null | undefined
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-1 text-muted-foreground">{icon}</div>
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="text-sm break-words">{value || '—'}</p>
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  )
}
