'use client';

import Link from 'next/link';
import {
  Home,
  Sparkles,
  Truck,
  Droplets,
  Waves,
  Wind,
  Brush,
  Fan,
  Trees,
  Car,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface ServiceCategory {
  icon: LucideIcon;
  name: string;
  description: string;
  searchParam: string;
}

const services: ServiceCategory[] = [
  {
    icon: Home,
    name: 'House Cleaning',
    description: 'Regular cleaning for apartments, condos, and houses',
    searchParam: 'House Cleaning',
  },
  {
    icon: Sparkles,
    name: 'Deep Cleaning',
    description: 'Thorough top-to-bottom cleaning for a fresh start',
    searchParam: 'Deep Cleaning',
  },
  {
    icon: Truck,
    name: 'Move-In / Move-Out',
    description: 'Get your deposit back or start fresh in your new home',
    searchParam: 'Move-In / Move-Out Cleaning',
  },
  {
    icon: Droplets,
    name: 'Pressure Washing',
    description: 'Driveways, patios, decks, and building exteriors',
    searchParam: 'Pressure Washing',
  },
  {
    icon: Waves,
    name: 'Pool Cleaning',
    description: 'Keep your pool sparkling and swim-ready year-round',
    searchParam: 'Pool Cleaning',
  },
  {
    icon: Wind,
    name: 'Window Cleaning',
    description: 'Crystal-clear windows inside and out',
    searchParam: 'Window Cleaning',
  },
  {
    icon: Brush,
    name: 'Carpet Cleaning',
    description: 'Professional carpet and upholstery care',
    searchParam: 'Carpet Cleaning',
  },
  {
    icon: Fan,
    name: 'Air Duct Cleaning',
    description: 'Improve air quality and HVAC efficiency',
    searchParam: 'Air Duct Cleaning',
  },
  {
    icon: Trees,
    name: 'Landscaping',
    description: 'Lawn care, garden maintenance, and outdoor beautification',
    searchParam: 'Landscaping',
  },
  {
    icon: Car,
    name: 'Mobile Car Wash',
    description: 'Auto detailing that comes to your doorstep',
    searchParam: 'Mobile Car Wash / Auto Detailing',
  },
];

export default function ServiceCategories() {
  return (
    <section className="py-20 sm:py-28 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <p className="text-brand-gold text-sm font-semibold tracking-[0.15em] uppercase mb-3">
            Services
          </p>
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-brand-dark mb-4">
            Home Services at Your Fingertips
          </h2>
          <p className="text-gray-500 text-lg">
            Browse professionals across all the home service categories you need
          </p>
        </div>

        {/* Service grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6">
          {services.map((service) => (
            <Link
              key={service.name}
              href={`/search?service=${encodeURIComponent(service.searchParam)}`}
              className="group relative bg-brand-cream/50 hover:bg-white border border-transparent hover:border-brand-gold/20 rounded-2xl p-5 sm:p-6 text-center transition-all duration-300 hover:shadow-lg hover:shadow-brand-gold/5 hover:-translate-y-1"
            >
              <div className="w-12 h-12 bg-brand-gold/10 group-hover:bg-brand-gold/20 rounded-xl flex items-center justify-center mx-auto mb-4 transition-colors duration-300">
                <service.icon className="h-6 w-6 text-brand-gold" />
              </div>
              <h3 className="font-semibold text-brand-dark text-sm mb-1.5">
                {service.name}
              </h3>
              <p className="text-gray-400 text-xs leading-relaxed hidden sm:block">
                {service.description}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
