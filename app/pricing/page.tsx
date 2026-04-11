'use client'

import { Check, Zap, Crown, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

export default function PricingPage() {
  const [loading, setLoading] = useState<string | null>(null)

  const plans = [
    {
      name: 'Basic',
      price: '$79',
      period: '/month',
      icon: Zap,
      description: 'Get started with quality leads for your cleaning business',
      features: [
        '5 leads per month',
        'Business profile listing',
        'Customer review management',
        'Analytics dashboard',
        'Email support',
      ],
      cta: 'Get Started',
      planKey: 'basic' as const,
      popular: false,
    },
    {
      name: 'Pro',
      price: '$199',
      period: '/month',
      icon: Crown,
      description: 'Scale your cleaning business with more leads and priority placement',
      features: [
        '15 leads per month',
        '$15 per additional lead',
        'Priority search placement',
        'Unlimited photos',
        'Advanced analytics',
        'Direct customer messaging',
        'Phone & email support',
      ],
      cta: 'Start Pro',
      planKey: 'pro' as const,
      popular: true,
    },
  ]

  const handlePlanSelection = async (planKey: 'basic' | 'pro') => {
    setLoading(planKey)
    try {
      window.location.href = '/signup'
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Simple, Transparent Pricing
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Connect with homeowners and businesses actively searching for professional cleaning services in Florida.
          </p>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {plans.map((plan) => (
            <div
              key={plan.planKey}
              className={`relative bg-white rounded-2xl shadow-lg overflow-hidden ${
                plan.popular ? 'ring-2 ring-[#FF5F1F]' : 'ring-1 ring-gray-200'
              }`}
            >
              {plan.popular && (
                <div className="bg-[#FF5F1F] text-white text-center py-2 text-sm font-semibold">
                  Most Popular
                </div>
              )}

              <div className="px-8 py-8">
                <div className="flex items-center mb-4">
                  <plan.icon
                    className={`h-8 w-8 mr-3 ${plan.popular ? 'text-[#FF5F1F]' : 'text-gray-500'}`}
                  />
                  <h2 className="text-2xl font-bold text-gray-900">{plan.name}</h2>
                </div>

                <p className="text-gray-600 mb-6">{plan.description}</p>

                <div className="flex items-baseline mb-8">
                  <span className="text-5xl font-bold text-gray-900">{plan.price}</span>
                  <span className="text-gray-500 ml-2">{plan.period}</span>
                </div>

                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start">
                      <Check className="h-5 w-5 text-[#FF5F1F] mr-3 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => handlePlanSelection(plan.planKey)}
                  disabled={loading !== null}
                  className={`w-full py-3 px-6 rounded-xl font-bold text-lg transition-all duration-200 ${
                    plan.popular
                      ? 'bg-[#FF5F1F] text-white hover:bg-[#e54e10] shadow-md hover:shadow-lg'
                      : 'bg-gray-900 text-white hover:bg-gray-800'
                  } disabled:opacity-60 disabled:cursor-not-allowed`}
                >
                  {loading === plan.planKey ? (
                    <span className="flex items-center justify-center">
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Processing...
                    </span>
                  ) : (
                    plan.cta
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Additional leads note */}
        <p className="text-center text-gray-500 text-sm mt-6">
          Pro plan: additional leads available at $15 each. Cancel anytime.
        </p>
      </div>

      {/* FAQ */}
      <div className="bg-white border-t border-gray-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <h2 className="text-2xl font-bold text-gray-900 text-center mb-10">
            Frequently Asked Questions
          </h2>
          <div className="space-y-8">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                What counts as a lead?
              </h3>
              <p className="text-gray-600">
                A lead is a verified customer actively requesting a quote for cleaning services in your service area.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                What happens if I need more than 15 leads on Pro?
              </h3>
              <p className="text-gray-600">
                Additional leads on the Pro plan are available at $15 each. You'll only be charged for leads you receive.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Can I cancel anytime?
              </h3>
              <p className="text-gray-600">
                Yes. There are no long-term contracts. Cancel your subscription at any time from your account settings.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                How do I get started?
              </h3>
              <p className="text-gray-600">
                Select a plan above, create your account, and complete your business profile. You'll start receiving leads once your profile is approved.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="bg-[#FF5F1F]">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-14 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-orange-200 mb-3">
            Purrfection is our Standard
          </p>
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Grow Your Cleaning Business?
          </h2>
          <p className="text-orange-100 mb-8">
            Questions? Reach us at{' '}
            <a href="mailto:contact@bossofclean.com" className="underline text-white">
              contact@bossofclean.com
            </a>
          </p>
          <Link
            href="/signup"
            className="inline-block bg-white text-[#FF5F1F] font-bold px-8 py-3 rounded-xl hover:bg-orange-50 transition-colors"
          >
            Get Started Today
          </Link>
        </div>
      </div>
    </div>
  )
}
