import { ClipboardList, Users, MessageCircle } from 'lucide-react';

const steps = [
  {
    number: '01',
    icon: ClipboardList,
    title: 'Tell Us What You Need',
    description: 'Enter your location and the type of service you\'re looking for.',
  },
  {
    number: '02',
    icon: Users,
    title: 'Browse Professionals',
    description: 'See cleaning professionals in your area with profiles and details.',
  },
  {
    number: '03',
    icon: MessageCircle,
    title: 'Connect Directly',
    description: 'Reach out to your chosen professional to discuss your needs.',
  },
];

export default function HowItWorks() {
  return (
    <section className="py-20 sm:py-28 bg-brand-cream">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <p className="text-brand-gold text-sm font-semibold tracking-[0.15em] uppercase mb-3">
            How It Works
          </p>
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-brand-dark mb-4">
            Simple, Straightforward Process
          </h2>
          <p className="text-gray-500 text-lg">
            Find the right professional for your home in three easy steps
          </p>
        </div>

        {/* Steps */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:gap-12 max-w-5xl mx-auto">
          {steps.map((step, index) => (
            <div key={step.number} className="relative text-center">
              {/* Connector line (desktop only) */}
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-12 left-[60%] w-[80%] h-px border-t-2 border-dashed border-brand-gold/20" />
              )}

              {/* Step number + icon */}
              <div className="relative inline-flex items-center justify-center mb-6">
                <div className="w-24 h-24 rounded-2xl bg-white shadow-sm flex items-center justify-center border border-gray-100">
                  <step.icon className="h-10 w-10 text-brand-gold" />
                </div>
                <span className="absolute -top-2 -right-2 w-8 h-8 bg-brand-dark text-white text-xs font-bold rounded-full flex items-center justify-center">
                  {step.number}
                </span>
              </div>

              <h3 className="font-display text-xl font-bold text-brand-dark mb-3">
                {step.title}
              </h3>
              <p className="text-gray-500 leading-relaxed max-w-xs mx-auto">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
