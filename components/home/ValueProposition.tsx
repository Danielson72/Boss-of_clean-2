import { MapPin, DollarSign, TrendingUp, Handshake } from 'lucide-react';

const values = [
  {
    icon: MapPin,
    title: 'Local Florida Professionals',
    description: 'Find service providers right in your neighborhood, across all 67 Florida counties.',
  },
  {
    icon: DollarSign,
    title: 'Free to Search',
    description: 'Browse and connect with professionals at no cost to homeowners.',
  },
  {
    icon: TrendingUp,
    title: 'Growing Network',
    description: 'New professionals joining across Florida as we build the most trusted home services marketplace.',
  },
  {
    icon: Handshake,
    title: 'Your Choice, Your Terms',
    description: 'Connect directly with professionals. No middleman markup on your services.',
  },
];

export default function ValueProposition() {
  return (
    <section className="py-20 sm:py-28 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <p className="text-brand-gold text-sm font-semibold tracking-[0.15em] uppercase mb-3">
            Why Boss of Clean
          </p>
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-brand-dark mb-4">
            The Smarter Way to Find Home Services
          </h2>
          <p className="text-gray-500 text-lg">
            Skip the endless searching. We make it easy to find the right professional for your home.
          </p>
        </div>

        {/* Value cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {values.map((value) => (
            <div
              key={value.title}
              className="group bg-brand-cream/50 rounded-2xl p-8 transition-all duration-300 hover:bg-white hover:shadow-lg hover:shadow-brand-gold/5 border border-transparent hover:border-brand-gold/10"
            >
              <div className="w-14 h-14 bg-brand-dark rounded-xl flex items-center justify-center mb-6 group-hover:bg-brand-gold transition-colors duration-300">
                <value.icon className="h-7 w-7 text-brand-gold group-hover:text-white transition-colors duration-300" />
              </div>
              <h3 className="font-display text-lg font-bold text-brand-dark mb-2">
                {value.title}
              </h3>
              <p className="text-gray-500 text-sm leading-relaxed">
                {value.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
