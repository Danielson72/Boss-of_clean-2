'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/context/AuthContext';
import { ProtectedRoute } from '@/lib/auth/protected-route';
import { getStripe } from '@/lib/stripe/client';
import { redirectToBillingPortal } from '@/lib/stripe/client';
import {
  SubscriptionStatusCard,
  LeadCreditsCard,
  PlanComparison,
  BillingHistory,
  PaymentMethodCard,
  defaultPlans,
} from '@/components/billing';
import type { Invoice, PaymentMethod } from '@/components/billing';
import { ArrowLeft, CheckCircle, XCircle } from 'lucide-react';
import Link from 'next/link';

interface BillingData {
  subscription: {
    planName: string;
    planTier: 'free' | 'basic' | 'pro';
    price: number;
    status: 'active' | 'canceled' | 'past_due' | 'trialing' | 'none';
    nextBillingDate?: string;
    cancelAt?: string;
  };
  leadCredits: {
    used: number;
    total: number;
    isUnlimited: boolean;
    resetDate: string;
    recentUsage: number[];
  };
  paymentMethod: PaymentMethod | null;
  invoices: Invoice[];
}

export default function BillingPage() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [billingData, setBillingData] = useState<BillingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgradeLoading, setUpgradeLoading] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // Check for success/cancel params from Stripe checkout
  useEffect(() => {
    const success = searchParams?.get('success');
    const canceled = searchParams?.get('canceled');

    if (success === 'true') {
      setNotification({
        type: 'success',
        message: 'Your subscription has been upgraded successfully!',
      });
      // Clear the URL params
      router.replace('/dashboard/cleaner/billing');
    } else if (canceled === 'true') {
      setNotification({
        type: 'error',
        message: 'Checkout was canceled. Your subscription remains unchanged.',
      });
      router.replace('/dashboard/cleaner/billing');
    }
  }, [searchParams, router]);

  // Fetch billing data
  useEffect(() => {
    if (user) {
      fetchBillingData();
    }
  }, [user]);

  const fetchBillingData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/cleaner/billing');

      if (!response.ok) {
        throw new Error('Failed to fetch billing data');
      }

      const data = await response.json();
      setBillingData(data);
    } catch (error) {
      // console.error('Error fetching billing data:', error);
      setNotification({
        type: 'error',
        message: 'Failed to load billing information. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async () => {
    router.push('#plans');
  };

  const handleManageBilling = async () => {
    try {
      setUpgradeLoading(true);
      await redirectToBillingPortal();
    } catch (error) {
      // console.error('Error opening billing portal:', error);
      setNotification({
        type: 'error',
        message: 'Failed to open billing portal. Please try again.',
      });
    } finally {
      setUpgradeLoading(false);
    }
  };

  const handleSelectPlan = async (planId: string) => {
    if (!billingData || planId === billingData.subscription.planTier) return;

    try {
      setLoadingPlan(planId);
      setUpgradeLoading(true);

      const response = await fetch('/api/cleaner/billing/upgrade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to process upgrade');
      }

      if (data.type === 'checkout' && data.url) {
        // Redirect to Stripe checkout
        window.location.href = data.url;
      } else if (data.type === 'updated') {
        // Plan was updated directly
        setNotification({
          type: 'success',
          message: 'Your subscription has been updated successfully!',
        });
        fetchBillingData();
      }
    } catch (error) {
      // console.error('Error upgrading plan:', error);
      setNotification({
        type: 'error',
        message: error instanceof Error ? error.message : 'Failed to upgrade plan',
      });
    } finally {
      setLoadingPlan(null);
      setUpgradeLoading(false);
    }
  };

  const handleUpdatePayment = async () => {
    try {
      await redirectToBillingPortal();
    } catch (error) {
      // console.error('Error opening billing portal:', error);
      setNotification({
        type: 'error',
        message: 'Failed to open payment settings. Please try again.',
      });
    }
  };

  const handleAddPayment = async () => {
    // For free users, redirect to upgrade flow
    router.push('#plans');
  };

  // Auto-dismiss notification
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  if (loading) {
    return (
      <ProtectedRoute requireRole="cleaner">
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading billing information...</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute requireRole="cleaner">
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center py-6">
              <Link
                href="/dashboard/cleaner"
                className="mr-4 p-2 hover:bg-gray-100 rounded-full transition"
              >
                <ArrowLeft className="h-5 w-5 text-gray-600" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  Billing & Subscription
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  Manage your subscription, view invoices, and update payment methods
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Notification Banner */}
        {notification && (
          <div
            className={`${
              notification.type === 'success'
                ? 'bg-green-50 border-green-200'
                : 'bg-red-50 border-red-200'
            } border-b`}
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
              <div className="flex items-center gap-3">
                {notification.type === 'success' ? (
                  <CheckCircle className="h-5 w-5 text-green-600" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600" />
                )}
                <p
                  className={
                    notification.type === 'success'
                      ? 'text-green-800'
                      : 'text-red-800'
                  }
                >
                  {notification.message}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {billingData && (
            <div className="space-y-8">
              {/* Top Row: Subscription + Lead Credits */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <SubscriptionStatusCard
                  planName={billingData.subscription.planName}
                  planTier={billingData.subscription.planTier}
                  price={billingData.subscription.price}
                  status={billingData.subscription.status}
                  nextBillingDate={billingData.subscription.nextBillingDate}
                  cancelAt={billingData.subscription.cancelAt}
                  onManageBilling={handleManageBilling}
                  onUpgrade={handleUpgrade}
                  isLoading={upgradeLoading}
                />
                <LeadCreditsCard
                  usedCredits={billingData.leadCredits.used}
                  totalCredits={billingData.leadCredits.total}
                  isUnlimited={billingData.leadCredits.isUnlimited}
                  resetDate={billingData.leadCredits.resetDate}
                  recentUsage={billingData.leadCredits.recentUsage}
                />
              </div>

              {/* Plan Comparison */}
              <div id="plans">
                <PlanComparison
                  plans={defaultPlans}
                  currentTier={billingData.subscription.planTier}
                  onSelectPlan={handleSelectPlan}
                  isLoading={upgradeLoading}
                  loadingPlan={loadingPlan || undefined}
                />
              </div>

              {/* Bottom Row: Payment Method + Billing History */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <PaymentMethodCard
                  paymentMethod={billingData.paymentMethod}
                  onUpdatePayment={handleUpdatePayment}
                  onAddPayment={handleAddPayment}
                  isLoading={upgradeLoading}
                />
                <BillingHistory invoices={billingData.invoices} />
              </div>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}
