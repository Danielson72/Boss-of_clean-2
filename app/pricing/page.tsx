'use client'

import { useState } from 'react'
import { Check, Star, Zap, Crown, Gift, Loader2, Users, CheckCircle } from 'lucide-react'
import { redirectToCheckout } from '@/lib/stripe/client'
import Link from 'next/link'
import { createLogger } from '@/lib/utils/logger'

const logger = createLogger({ file: 'app/pricing/page.tsx' })

export default function PricingPage() {
  const [loading, setLoading] = useState<string | null>(null)
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly')
  
  const getPrice = (basePrice: number, isAnnual: boolean) => {
    if (isAnnual) {
      return Math.round(basePrice * 0.75) // 25% discount for annual
    }
    return basePrice
  }

  const plans = [
    {
      name: 'Free',
      basePrice: 0,
      price: '$0',
      period: billingCycle === 'monthly' ? '/month' : '/year',
      icon: Gift,
      description: 'Perfect for getting started',
      revenueBoost: 'Earn up to $500/month',
      customerIncrease: '2-5 new customers',
      features: [
        'Basic business listing',
        '1 photo only',
        'Contact information display',
        'Basic customer reviews',
        'Email support'
      ],
      popular: false,
      free: true,
      planKey: 'free' as const
    },
    {
      name: 'Basic',
      basePrice: 79,
      price: `$${getPrice(79, billingCycle === 'annual')}`,
      originalPrice: billingCycle === 'annual' ? '$79' : null,
      period: billingCycle === 'monthly' ? '/month' : '/year',
      savings: billingCycle === 'annual' ? 'Save $237/year' : null,
      icon: Zap,
      description: 'Most popular for growing businesses',
      revenueBoost: 'Earn up to $2,500/month',
      customerIncrease: '10-25 new customers',
      roi: 'Average ROI: 3,160%',
      features: [
        'Premium business listing',
        '20 lead credits/month',
        'Unlimited photos',
        'Priority in search results',
        'Business analytics',
        'Phone & email support'
      ],
      popular: true,
      free: false,
      planKey: 'basic' as const
    },
    {
      name: 'Pro',
      basePrice: 199,
      price: `$${getPrice(199, billingCycle === 'annual')}`,
      originalPrice: billingCycle === 'annual' ? '$199' : null,
      period: billingCycle === 'monthly' ? '/month' : '/year',
      savings: billingCycle === 'annual' ? 'Save $597/year' : null,
      icon: Crown,
      description: 'For established cleaning companies',
      revenueBoost: 'Earn up to $10,000+/month',
      customerIncrease: '50+ new customers',
      roi: 'Average ROI: 5,000%',
      features: [
        'Featured business listing',
        'Unlimited lead credits',
        'Unlimited photos & videos',
        'Top placement in search',
        'Direct customer messaging',
        'Advanced analytics & insights',
        'Dedicated account manager',
        '24/7 priority support'
      ],
      popular: false,
      free: false,
      planKey: 'pro' as const
    }
  ]

  const handlePlanSelection = async (planKey: 'free' | 'basic' | 'pro') => {
    if (planKey === 'free') {
      // Free plan - redirect to signup
      window.location.href = '/signup'
      return
    }

    setLoading(planKey)
    try {
      await redirectToCheckout(planKey)
    } catch (error) {
      logger.error('Failed to start checkout', { function: 'handlePlanSelection', error })
      alert('Failed to start checkout. Please try again.')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            {/* Enhanced Limited Time Offer Banner */}
            <div className="bg-gradient-to-r from-red-500 to-pink-600 text-white rounded-lg px-6 py-4 inline-block mb-6 relative overflow-hidden">
              <div className="absolute inset-0 bg-white opacity-10 animate-pulse"></div>
              <div className="relative z-10">
                <p className="font-bold text-lg flex items-center justify-center">
                  <Gift className="h-6 w-6 mr-2 animate-bounce" />
                  🚀 LIMITED TIME: First Month FREE + 25% Off Annual Plans
                </p>
                <p className="text-center text-sm mt-1 text-red-100">
                  ⏰ Only 6 days left! Join 247 cleaners who upgraded this week
                </p>
              </div>
            </div>
            
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Choose Your Plan
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-4">
              Join thousands of cleaning professionals who trust Boss of Clean to grow their business. 
              Choose the plan that fits your needs and start getting more customers today.
            </p>
            
            {/* Social Proof */}
            <div className="flex justify-center items-center gap-6 text-sm text-gray-600 mb-4">
              <div className="flex items-center">
                <Star className="h-4 w-4 text-yellow-500 mr-1" />
                <span>4.9/5 Rating</span>
              </div>
              <div className="flex items-center">
                <Users className="h-4 w-4 text-blue-500 mr-1" />
                <span>2,847+ Happy Customers</span>
              </div>
              <div className="flex items-center">
                <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
                <span>Cancel Anytime</span>
              </div>
            </div>
            
            {/* Billing Toggle */}
            <div className="flex justify-center mt-8">
              <div className="bg-gray-100 rounded-lg p-1 flex">
                <button
                  onClick={() => setBillingCycle('monthly')}
                  className={`px-4 py-2 rounded-md font-semibold transition-all ${
                    billingCycle === 'monthly'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setBillingCycle('annual')}
                  className={`px-4 py-2 rounded-md font-semibold transition-all relative ${
                    billingCycle === 'annual'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Annual
                  <span className="absolute -top-2 -right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full">
                    25% OFF
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {plans.map((plan, index) => (
            <div
              key={index}
              className={`relative bg-white rounded-lg shadow-lg overflow-hidden ${
                plan.popular ? 'ring-2 ring-blue-600 transform scale-105' : ''
              } ${plan.free ? 'ring-2 ring-green-500' : ''}`}
            >
              {plan.popular && (
                <div className="absolute top-0 left-0 right-0 bg-blue-600 text-white text-center py-2 text-sm font-medium">
                  Most Popular
                </div>
              )}
              {plan.free && (
                <div className="absolute top-0 left-0 right-0 bg-green-500 text-white text-center py-2 text-sm font-medium">
                  Free Plan
                </div>
              )}
              
              <div className={`px-6 ${(plan.popular || plan.free) ? 'pt-12 pb-8' : 'py-8'}`}>
                <div className="text-center mb-8">
                  <plan.icon className={`h-12 w-12 mx-auto mb-4 ${
                    plan.popular ? 'text-blue-600' : 
                    plan.free ? 'text-green-500' : 
                    'text-gray-400'
                  }`} />
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    {plan.name}
                  </h3>
                  <p className="text-gray-600 mb-4">
                    {plan.description}
                  </p>
                  
                  {/* Revenue Potential Highlight */}
                  <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-3 mb-4 border border-green-200">
                    <div className="text-center">
                      <p className="text-lg font-bold text-green-700">{plan.revenueBoost}</p>
                      <p className="text-sm text-gray-600">{plan.customerIncrease}</p>
                      {plan.roi && (
                        <p className="text-xs font-semibold text-blue-600 mt-1">{plan.roi}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-center">
                    <div className="flex items-baseline justify-center">
                      {plan.originalPrice && (
                        <span className="text-lg text-gray-400 line-through mr-2">
                          {plan.originalPrice}
                        </span>
                      )}
                      <span className="text-4xl font-bold text-gray-900">
                        {plan.price}
                      </span>
                      <span className="text-lg text-gray-500 ml-1">
                        {plan.period}
                      </span>
                    </div>
                    {plan.savings && (
                      <div className="mt-1 text-sm font-semibold text-green-600">
                        {plan.savings}
                      </div>
                    )}
                  </div>
                </div>
                
                <ul className="space-y-4 mb-8">
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-start">
                      <Check className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>
                
                <button
                  onClick={() => handlePlanSelection(plan.planKey)}
                  disabled={loading !== null}
                  className={`w-full py-4 px-4 rounded-xl font-bold text-lg transition-all duration-300 flex flex-col items-center justify-center min-h-[80px] group relative overflow-hidden ${
                    plan.popular
                      ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 shadow-lg hover:shadow-xl transform hover:scale-105'
                      : plan.free
                      ? 'bg-gradient-to-r from-green-500 to-green-600 text-white hover:from-green-600 hover:to-green-700 shadow-lg hover:shadow-xl transform hover:scale-105'
                      : 'bg-gradient-to-r from-gray-600 to-gray-700 text-white hover:from-gray-700 hover:to-gray-800 shadow-lg hover:shadow-xl transform hover:scale-105'
                  } disabled:cursor-not-allowed disabled:transform-none disabled:shadow-md`}
                >
                  <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity duration-200"></div>
                  {loading === plan.planKey ? (
                    <div className="relative z-10">
                      <Loader2 className="w-6 h-6 mb-1 animate-spin" />
                      <span>Processing...</span>
                    </div>
                  ) : (
                    <div className="relative z-10 text-center">
                      <span className="block">
                        {plan.free ? 'Start Free Today' : `Start ${plan.name} Plan`}
                      </span>
                      <span className="text-xs mt-1 opacity-90">
                        {plan.free ? 'No credit card required' : plan.popular ? 'Most popular choice' : 'Premium features included'}
                      </span>
                    </div>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Features Comparison */}
      <div className="bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Why Choose Boss of Clean?
            </h2>
            <p className="text-lg text-gray-600">
              We help cleaning businesses succeed with powerful tools and dedicated support
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Star className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Verified Reviews
              </h3>
              <p className="text-gray-600">
                Build trust with authentic customer reviews and ratings
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Zap className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Instant Leads
              </h3>
              <p className="text-gray-600">
                Get connected with customers actively looking for your services
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Crown className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Premium Placement
              </h3>
              <p className="text-gray-600">
                Stand out from competitors with priority search positioning
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Easy Management
              </h3>
              <p className="text-gray-600">
                Simple tools to manage your listing, leads, and customer communications
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* FAQ Section */}
      <div className="bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Frequently Asked Questions
            </h2>
          </div>
          
          <div className="space-y-8">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                How quickly can I start receiving leads?
              </h3>
              <p className="text-gray-600">
                Most businesses start receiving leads within 24-48 hours of setting up their complete profile. Premium plans get priority placement for faster results.
              </p>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Can I change my plan at any time?
              </h3>
              <p className="text-gray-600">
                Yes! You can upgrade or downgrade your plan at any time. Changes take effect immediately, and billing is prorated accordingly.
              </p>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Do you offer a satisfaction commitment?
              </h3>
              <p className="text-gray-600">
                We offer a 30-day money-back policy for all new subscribers. If you&apos;re not satisfied with the results, we&apos;ll refund your first month&apos;s payment.
              </p>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Is there a setup fee?
              </h3>
              <p className="text-gray-600">
                No setup fees! The price you see is what you pay. We believe in transparent, straightforward pricing with no hidden costs.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-blue-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Grow Your Cleaning Business?
          </h2>
          <p className="text-xl text-blue-100 mb-8">
            Join Boss of Clean today and start connecting with customers who need your services
          </p>
          <button className="bg-white text-blue-600 px-8 py-3 rounded-md font-semibold hover:bg-gray-100 transition duration-300">
            Start Your Free Trial
          </button>
        </div>
      </div>
    </div>
  );
}