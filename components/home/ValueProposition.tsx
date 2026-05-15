import { MapPin, DollarSign, Layers, Handshake } from 'lucide-react';

const values = [
  {
    icon: MapPin,
    title: 'Local Florida Pros',
    description: 'Verified pros in all 67 counties, serving both residential and commercial customers.',
  },
  {
    icon: DollarSign,
    title: 'Free to Search',
    description: 'Browse pros and request quotes at no cost — homeowners and businesses welcome.',
  },
  {
    icon: Layers,
    title: 'Every Pro Service',
    description: 'From cleaning to plumbing, handyman to HVAC — find every pro service in one place.',
  },
  {
    icon: Handshake,
    title: 'Direct, No Markup',
    description: 'Connect directly with pros. No middleman markup. No inflated lead fees.',
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
            The Fair, Transparent Alternative to Thumbtack, Angi &amp; HomeAdvisor
          </h2>
          <p className="text-gray-500 text-lg">
            No inflated lead fees. No middleman markup. Just direct connections between Floridians and the pros who serve them — residential and commercial.
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
