import { Check, Star, Zap, Crown, Gift } from 'lucide-react';

export default function PricingPage() {
  const plans = [
    {
      name: 'Free',
      price: '$0',
      period: '/month',
      icon: Gift,
      description: 'Perfect for getting started',
      features: [
        'Basic business listing',
        '1 photo only',
        'Contact information display',
        'Basic customer reviews',
        'Email support'
      ],
      popular: false,
      free: true
    },
    {
      name: 'Basic',
      price: '$29',
      period: '/month',
      icon: Star,
      description: 'Perfect for small cleaning businesses',
      features: [
        'Basic business listing',
        'Up to 5 photos',
        'Contact information display',
        'Basic customer reviews',
        'Email support'
      ],
      popular: false
    },
    {
      name: 'Professional',
      price: '$79',
      period: '/month',
      icon: Zap,
      description: 'Most popular for growing businesses',
      features: [
        'Premium business listing',
        'Unlimited photos',
        'Priority in search results',
        'Advanced review management',
        'Lead contact information',
        'Business analytics',
        'Phone & email support'
      ],
      popular: true
    },
    {
      name: 'Enterprise',
      price: '$149',
      period: '/month',
      icon: Crown,
      description: 'For established cleaning companies',
      features: [
        'Featured business listing',
        'Unlimited photos & videos',
        'Top placement in search',
        'Full review management suite',
        'Direct customer messaging',
        'Advanced analytics & insights',
        'Multiple location support',
        'Dedicated account manager',
        '24/7 priority support'
      ],
      popular: false
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Choose Your Plan
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Join thousands of cleaning professionals who trust Boss of Clean to grow their business. 
              Choose the plan that fits your needs and start getting more customers today.
            </p>
          </div>
        </div>
      </div>

      {/* Pricing Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
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
                  <div className="flex items-baseline justify-center">
                    <span className="text-4xl font-bold text-gray-900">
                      {plan.price}
                    </span>
                    <span className="text-lg text-gray-500 ml-1">
                      {plan.period}
                    </span>
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
                  className={`w-full py-3 px-4 rounded-md font-semibold transition duration-300 ${
                    plan.popular
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : plan.free
                      ? 'bg-green-500 text-white hover:bg-green-600'
                      : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                  }`}
                >
                  Get Started
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
                Do you offer any guarantees?
              </h3>
              <p className="text-gray-600">
                We offer a 30-day money-back guarantee for all new subscribers. If you're not satisfied with the results, we'll refund your first month's payment.
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