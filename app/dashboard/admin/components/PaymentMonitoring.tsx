'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DollarSign, TrendingUp, CreditCard, ArrowUpRight, ArrowDownRight, Users } from 'lucide-react'
import type { PaymentMonitoringData } from '@/lib/services/admin-payments'

interface PaymentMonitoringProps {
  data: PaymentMonitoringData
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount)
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function statusBadge(status: string) {
  const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    succeeded: 'default',
    active: 'default',
    pending: 'secondary',
    failed: 'destructive',
    canceled: 'destructive',
    cancelled: 'destructive',
    past_due: 'destructive',
    refunded: 'outline',
  }

  return (
    <Badge variant={variants[status] || 'outline'} className="text-xs">
      {status}
    </Badge>
  )
}

function tierBadge(tier: string) {
  const colors: Record<string, string> = {
    free: 'bg-gray-100 text-gray-700',
    basic: 'bg-blue-100 text-blue-700',
    pro: 'bg-purple-100 text-purple-700',
    enterprise: 'bg-amber-100 text-amber-700',
  }

  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[tier] || 'bg-gray-100 text-gray-700'}`}>
      {tier}
    </span>
  )
}

export function PaymentMonitoring({ data }: PaymentMonitoringProps) {
  const { recentLeadClaims, recentSubscriptionChanges, revenueSummary } = data

  return (
    <div className="space-y-6">
      {/* Revenue Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(revenueSummary.todayRevenue)}</div>
            <p className="text-xs text-muted-foreground">
              {revenueSummary.todayLeadCharges} lead charge{revenueSummary.todayLeadCharges !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Week</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(revenueSummary.weekRevenue)}</div>
            <p className="text-xs text-muted-foreground">
              {revenueSummary.weekLeadCharges} lead charge{revenueSummary.weekLeadCharges !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Month</CardTitle>
            <CreditCard className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(revenueSummary.monthRevenue)}</div>
            <p className="text-xs text-muted-foreground">
              {revenueSummary.monthLeadCharges} lead charge{revenueSummary.monthLeadCharges !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Subscription MRR</CardTitle>
            <Users className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(revenueSummary.subscriptionMrr)}</div>
            <p className="text-xs text-muted-foreground">
              {revenueSummary.activeBasic} Basic + {revenueSummary.activePro} Pro
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Lead Claims */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowUpRight className="h-5 w-5 text-green-600" />
              Recent Lead Claims
            </CardTitle>
            <CardDescription>Lead purchases with payment status</CardDescription>
          </CardHeader>
          <CardContent>
            {recentLeadClaims.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <DollarSign className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No lead charges yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentLeadClaims.map((claim) => (
                  <div key={claim.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">{claim.cleanerName}</span>
                        {tierBadge(claim.cleanerTier)}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {claim.leadServiceType?.replace('_', ' ')}
                        {claim.leadCity && ` - ${claim.leadCity}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 ml-4">
                      <span className="font-semibold text-sm">{formatCurrency(claim.amount)}</span>
                      {statusBadge(claim.status)}
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(claim.createdAt)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Subscription Changes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ArrowDownRight className="h-5 w-5 text-blue-600" />
              Subscription Activity
            </CardTitle>
            <CardDescription>Recent subscription changes and upgrades</CardDescription>
          </CardHeader>
          <CardContent>
            {recentSubscriptionChanges.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CreditCard className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No subscription changes yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentSubscriptionChanges.map((change) => (
                  <div key={change.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">{change.cleanerName}</span>
                        {tierBadge(change.newTier)}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatCurrency(change.monthlyPrice)}/mo
                      </p>
                    </div>
                    <div className="flex items-center gap-3 ml-4">
                      {statusBadge(change.status)}
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(change.changedAt)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
