import { Star, MessageSquarePlus } from 'lucide-react';
import Link from 'next/link';

// Reusable testimonial card component for future real testimonials
interface Testimonial {
  name: string;
  city: string;
  serviceType: string;
  text: string;
  rating: number;
  date: string;
  verifiedBooking?: boolean;
}

function TestimonialCard({ testimonial }: { testimonial: Testimonial }) {
  return (
    <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow duration-300">
      {/* Stars */}
      <div className="flex items-center gap-0.5 mb-4">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={`h-4 w-4 ${
              i < testimonial.rating
                ? 'text-brand-gold fill-brand-gold'
                : 'text-gray-200'
            }`}
          />
        ))}
      </div>

      {/* Text */}
      <p className="text-gray-600 text-sm leading-relaxed mb-5">
        &ldquo;{testimonial.text}&rdquo;
      </p>

      {/* Author */}
      <div className="flex items-center justify-between">
        <div>
          <p className="font-semibold text-brand-dark text-sm">{testimonial.name}</p>
          <p className="text-xs text-gray-400">{testimonial.city}</p>
        </div>
        <span className="text-xs text-brand-gold bg-brand-gold/10 px-2.5 py-1 rounded-full font-medium">
          {testimonial.serviceType}
        </span>
      </div>

      {/* Verified badge - for future use */}
      {testimonial.verifiedBooking && (
        <div className="mt-3 pt-3 border-t border-gray-50">
          <span className="text-xs text-green-600 font-medium">Verified Booking</span>
        </div>
      )}
    </div>
  );
}

// For now, there are no real testimonials. This array will be populated
// with genuine customer reviews as they come in.
const realTestimonials: Testimonial[] = [];

export default function TestimonialSection() {
  // If real testimonials exist, show them
  if (realTestimonials.length > 0) {
    return (
      <section className="py-20 sm:py-28 bg-brand-cream">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <p className="text-brand-gold text-sm font-semibold tracking-[0.15em] uppercase mb-3">
              Testimonials
            </p>
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-brand-dark mb-4">
              What Our Customers Say
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {realTestimonials.map((t, i) => (
              <TestimonialCard key={i} testimonial={t} />
            ))}
          </div>
        </div>
      </section>
    );
  }

  // Coming soon state
  return (
    <section className="py-20 sm:py-28 bg-brand-cream">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-brand-gold text-sm font-semibold tracking-[0.15em] uppercase mb-3">
            Testimonials
          </p>
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-brand-dark mb-4">
            Real Reviews Coming Soon
          </h2>
          <p className="text-gray-500 text-lg mb-10 leading-relaxed">
            We&apos;re building Florida&apos;s most trusted home services marketplace.
            As our first customers and professionals join,
            their genuine experiences will appear right here.
          </p>

          {/* Share experience CTA */}
          <div className="bg-white rounded-2xl p-8 border border-gray-100 shadow-sm max-w-lg mx-auto">
            <MessageSquarePlus className="h-10 w-10 text-brand-gold mx-auto mb-4" />
            <p className="text-brand-dark font-semibold mb-2">
              Had a great experience with a Boss of Clean professional?
            </p>
            <p className="text-gray-500 text-sm mb-6">
              We&apos;d love to hear about it.
            </p>
            <Link
              href="/contact"
              className="inline-flex items-center gap-2 bg-brand-gold hover:bg-brand-gold-light text-white px-6 py-3 rounded-xl font-semibold text-sm tracking-wide transition-all duration-200 shadow-sm hover:shadow-md"
            >
              Share Your Experience
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

// Export the card component for reuse elsewhere
export { TestimonialCard };
export type { Testimonial };
