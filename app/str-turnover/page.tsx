import {
  KeyRound,
  CheckCircle,
  Clock,
  Shield,
  Camera,
  Sparkles,
  CalendarCheck,
  Users,
  ClipboardList,
  ArrowRight,
  Star,
  Home,
} from 'lucide-react';
import Link from 'next/link';

export const metadata = {
  title: 'Airbnb & Vacation Rental Turnover Cleaning | Boss of Clean Florida',
  description:
    'Professional STR turnover cleaning for Airbnb, VRBO, and vacation rental hosts in Florida. Same-day turnovers, linen service, amenity restocking, and damage reporting.',
};

const TURNOVER_CHECKLIST = [
  { area: 'Kitchen', items: ['Counters & appliances wiped', 'Dishes washed & put away', 'Fridge cleaned out', 'Coffee maker reset & restocked', 'Trash emptied & new liner'] },
  { area: 'Bathrooms', items: ['Toilet, tub & shower scrubbed', 'Mirrors & fixtures polished', 'Fresh towels set out', 'Toiletries restocked', 'Floor mopped'] },
  { area: 'Bedrooms', items: ['Fresh linens & made beds', 'Surfaces dusted', 'Closets checked & organized', 'Under-bed check for left items', 'Nightstands wiped'] },
  { area: 'Living Areas', items: ['Floors vacuumed & mopped', 'Surfaces & decor dusted', 'Couch cushions fluffed', 'Remotes & guides placed', 'Windows & sliders cleaned'] },
  { area: 'Exterior / Entry', items: ['Front door & porch swept', 'Lockbox / smart lock verified', 'Patio furniture wiped', 'Pool area tidied (if applicable)', 'Welcome mat clean'] },
];

export default function STRTurnoverPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div className="bg-gradient-to-br from-indigo-700 via-blue-700 to-cyan-600 text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-1.5 text-sm font-medium mb-6">
                <KeyRound className="h-4 w-4" />
                Built for STR Hosts & Property Managers
              </div>
              <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">
                Airbnb Turnover Cleaning That Never Lets You Down
              </h1>
              <p className="text-xl text-blue-100 mb-8 max-w-lg">
                Same-day turnovers, linen changes, restocking, and damage reports.
                Your guests get a spotless arrival every time.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Link
                  href="/quote-request?service=str_turnover"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-blue-700 rounded-lg font-semibold hover:bg-blue-50 transition"
                >
                  Get Turnover Quotes
                  <ArrowRight className="h-5 w-5" />
                </Link>
                <Link
                  href="/search?service=Airbnb+%2F+STR+Turnover"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 border-2 border-white/30 text-white rounded-lg font-semibold hover:bg-white/10 transition"
                >
                  Browse STR Cleaners
                </Link>
              </div>
            </div>
            <div className="hidden lg:grid grid-cols-2 gap-4">
              <div className="space-y-4">
                <div className="bg-white/10 backdrop-blur rounded-xl p-5">
                  <Clock className="h-8 w-8 text-cyan-300 mb-2" />
                  <p className="font-semibold text-lg">2-4 Hour Turnovers</p>
                  <p className="text-sm text-blue-200">Back-to-back bookings handled</p>
                </div>
                <div className="bg-white/10 backdrop-blur rounded-xl p-5">
                  <Camera className="h-8 w-8 text-cyan-300 mb-2" />
                  <p className="font-semibold text-lg">Photo Reports</p>
                  <p className="text-sm text-blue-200">Proof your property is guest-ready</p>
                </div>
              </div>
              <div className="space-y-4 mt-8">
                <div className="bg-white/10 backdrop-blur rounded-xl p-5">
                  <Shield className="h-8 w-8 text-cyan-300 mb-2" />
                  <p className="font-semibold text-lg">Purrfection Promise</p>
                  <p className="text-sm text-blue-200">Quality you can count on</p>
                </div>
                <div className="bg-white/10 backdrop-blur rounded-xl p-5">
                  <ClipboardList className="h-8 w-8 text-cyan-300 mb-2" />
                  <p className="font-semibold text-lg">Custom Checklists</p>
                  <p className="text-sm text-blue-200">Your standards, every time</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* How It Works */}
        <section className="py-16">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-4">
            How STR Turnover Works
          </h2>
          <p className="text-gray-600 text-center max-w-2xl mx-auto mb-12">
            From checkout to checkin-ready in hours, not days.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              {
                step: '1',
                icon: CalendarCheck,
                title: 'Schedule Turnovers',
                description: 'Submit your turnover dates or sync your rental calendar. Schedule recurring or one-off cleans.',
              },
              {
                step: '2',
                icon: Users,
                title: 'Get Matched',
                description: 'We match you with STR cleaning professionals in your area who specialize in vacation rental turnovers.',
              },
              {
                step: '3',
                icon: Sparkles,
                title: 'Turnover Complete',
                description: 'Your cleaner follows your custom checklist — clean, restock, stage, and report any issues.',
              },
              {
                step: '4',
                icon: Camera,
                title: 'Photo Confirmation',
                description: 'Receive a photo report confirming every room is guest-ready before checkin.',
              },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.step} className="text-center">
                  <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-100 rounded-full mb-4">
                    <Icon className="h-7 w-7 text-blue-600" />
                  </div>
                  <div className="text-sm font-semibold text-blue-600 mb-1">Step {item.step}</div>
                  <h3 className="font-bold text-gray-900 mb-2">{item.title}</h3>
                  <p className="text-sm text-gray-600">{item.description}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* What's Included */}
        <section className="py-16 border-t border-gray-200">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-4">
            What Every Turnover Includes
          </h2>
          <p className="text-gray-600 text-center max-w-2xl mx-auto mb-12">
            Our standard STR turnover checklist covers everything your guests expect.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Sparkles, title: 'Full Deep Clean', desc: 'Every surface cleaned and sanitized to hotel standards.' },
              { icon: Home, title: 'Linen & Towel Change', desc: 'Fresh sheets, pillowcases, and towels for every guest.' },
              { icon: ClipboardList, title: 'Amenity Restocking', desc: 'Toiletries, coffee, paper products, and supplies replenished.' },
              { icon: Camera, title: 'Photo Report', desc: 'Room-by-room photos confirming the property is guest-ready.' },
              { icon: Shield, title: 'Damage Inspection', desc: 'Walkthrough to flag any damage, maintenance issues, or missing items.' },
              { icon: Star, title: 'Guest-Ready Staging', desc: 'Remotes placed, welcome materials set, and property photo-ready.' },
            ].map((item, i) => {
              const Icon = item.icon;
              return (
                <div key={i} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <Icon className="h-8 w-8 text-blue-600 mb-3" />
                  <h3 className="font-semibold text-gray-900 mb-1">{item.title}</h3>
                  <p className="text-sm text-gray-600">{item.desc}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Turnover Checklist */}
        <section className="py-16 border-t border-gray-200">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-4">
            Sample Turnover Checklist
          </h2>
          <p className="text-gray-600 text-center max-w-2xl mx-auto mb-12">
            Every cleaner follows a detailed checklist. Here&apos;s what a standard turnover covers.
            You can customize this for your property.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {TURNOVER_CHECKLIST.map((section) => (
              <div key={section.area} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="font-bold text-gray-900 mb-3">{section.area}</h3>
                <ul className="space-y-2">
                  {section.items.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                      <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0 mt-0.5" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {/* Pricing */}
        <section className="py-16 border-t border-gray-200">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-4">
            Turnover Pricing
          </h2>
          <p className="text-gray-600 text-center max-w-2xl mx-auto mb-12">
            Transparent pricing based on property size. Most hosts pass the cleaning fee to guests.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {[
              { size: '1-2 Bedrooms', price: '$100 - $175', time: '2-3 hours', popular: false },
              { size: '3-4 Bedrooms', price: '$175 - $275', time: '3-4 hours', popular: true },
              { size: '5+ Bedrooms', price: '$275 - $350+', time: '4-6 hours', popular: false },
            ].map((tier) => (
              <div
                key={tier.size}
                className={`rounded-lg border p-6 text-center ${
                  tier.popular
                    ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-500'
                    : 'border-gray-200 bg-white'
                }`}
              >
                {tier.popular && (
                  <div className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-2">
                    Most Popular
                  </div>
                )}
                <h3 className="font-bold text-gray-900 text-lg mb-1">{tier.size}</h3>
                <p className="text-3xl font-bold text-blue-600 mb-1">{tier.price}</p>
                <p className="text-sm text-gray-500 mb-4">per turnover</p>
                <p className="text-sm text-gray-600">
                  <Clock className="inline h-4 w-4 mr-1" />
                  {tier.time} avg
                </p>
              </div>
            ))}
          </div>
          <p className="text-center text-sm text-gray-500 mt-6">
            Prices vary by property condition, location, and whether linen service is included.
            Get an exact quote from cleaners in your area.
          </p>
        </section>

        {/* Property Manager Benefits */}
        <section className="py-16 border-t border-gray-200">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-4">
            Built for Property Managers
          </h2>
          <p className="text-gray-600 text-center max-w-2xl mx-auto mb-12">
            Managing multiple units? Boss of Clean helps you scale turnover operations.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {[
              {
                title: 'Multi-Property Support',
                description: 'Manage turnovers across all your properties from one dashboard. Track cleaning status for each unit.',
              },
              {
                title: 'Consistent Quality',
                description: 'Standardized checklists ensure every property meets the same high standards regardless of which cleaner handles the turnover.',
              },
              {
                title: 'Last-Minute Coverage',
                description: 'Unexpected booking? Our network of cleaning professionals provides backup coverage so you never miss a turnover.',
              },
              {
                title: 'Damage & Maintenance Alerts',
                description: 'Cleaners report damage, maintenance issues, and supply shortages during every turnover so nothing slips through the cracks.',
              },
            ].map((item, i) => (
              <div key={i} className="flex items-start gap-4 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <CheckCircle className="h-6 w-6 text-green-500 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">{item.title}</h3>
                  <p className="text-sm text-gray-600">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 border-t border-gray-200">
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-10 text-center text-white">
            <h2 className="text-3xl font-bold mb-4">
              Ready to Streamline Your Turnovers?
            </h2>
            <p className="text-blue-100 max-w-xl mx-auto mb-8">
              Get matched with experienced STR cleaning professionals in your area.
              Every turnover is backed by our Purrfection Promise.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/quote-request?service=str_turnover"
                className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-white text-blue-700 rounded-lg font-semibold hover:bg-blue-50 transition"
              >
                Get Free Quotes
                <ArrowRight className="h-5 w-5" />
              </Link>
              <Link
                href="/guarantee"
                className="inline-flex items-center justify-center gap-2 px-8 py-3 border-2 border-white/30 text-white rounded-lg font-semibold hover:bg-white/10 transition"
              >
                <Shield className="h-5 w-5" />
                Purrfection Promise
              </Link>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
