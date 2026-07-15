'use client';

import Link from 'next/link';
import Image from 'next/image';
import {
  Home,
  Sparkles,
  Wrench,
  Droplets,
  Waves,
  Fan,
  Thermometer,
  ShowerHead,
  Zap,
  Bug,
  Trees,
  TreePine,
  Car,
  Brush,
  Trash2,
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
    description: 'Recurring or one-time, residential and commercial',
    searchParam: 'House Cleaning',
  },
  {
    icon: Sparkles,
    name: 'Deep Cleaning',
    description: 'Top-to-bottom for move-ins, post-construction, or seasonal resets',
    searchParam: 'Deep Cleaning',
  },
  {
    icon: Wrench,
    name: 'Handyman Services',
    description: 'Repairs, installs, and small fixes around the house',
    searchParam: 'Handyman Services',
  },
  {
    icon: Droplets,
    name: 'Pressure Washing',
    description: 'Driveways, patios, decks, and building exteriors',
    searchParam: 'Pressure Washing',
  },
  {
    icon: Waves,
    name: 'Pool Service',
    description: 'Cleaning, maintenance, and chemical balancing',
    searchParam: 'Pool Cleaning',
  },
  {
    icon: Fan,
    name: 'Air Duct Cleaning',
    description: 'Improve air quality and HVAC efficiency',
    searchParam: 'Air Duct Cleaning',
  },
  {
    icon: Thermometer,
    name: 'HVAC Services',
    description: 'Heating, cooling, repair, and tune-ups',
    searchParam: 'HVAC Services',
  },
  {
    icon: ShowerHead,
    name: 'Plumbing',
    description: 'Leaks, installs, drain cleaning, and emergencies',
    searchParam: 'Plumbing',
  },
  {
    icon: Zap,
    name: 'Electrical',
    description: 'Outlets, fixtures, panels, and safety inspections',
    searchParam: 'Electrical',
  },
  {
    icon: Bug,
    name: 'Pest Control',
    description: 'Routine treatments and one-time extermination',
    searchParam: 'Pest Control',
  },
  {
    icon: Trees,
    name: 'Landscaping & Yard',
    description: 'Lawn care, yard cleanup, and tree work',
    searchParam: 'Landscaping',
  },
  {
    icon: Car,
    name: 'Mobile Car Detailing',
    description: 'Auto detailing that comes to your driveway',
    searchParam: 'Mobile Car Wash / Auto Detailing',
  },
  {
    icon: Brush,
    name: 'Gutter Cleaning',
    description: 'Clear gutters, downspouts, and roof debris',
    searchParam: 'Gutter Cleaning',
  },
  {
    icon: Trash2,
    name: 'Junk Removal',
    description: 'Haul-away for furniture, appliances, and clutter',
    searchParam: 'Junk Removal',
  },
];

// slug → icon for DB-driven categories; anything unmapped gets Sparkles.
const SLUG_ICONS: Record<string, LucideIcon> = {
  residential: Home,
  deep_cleaning: Sparkles,
  maid_service: Brush,
  move_in_out: Home,
  post_construction: Wrench,
  str_turnover: Home,
  window_cleaning: ShowerHead,
  carpet_cleaning: Brush,
  pressure_washing: Droplets,
  air_duct_cleaning: Fan,
  landscaping: Trees,
  handyman: Wrench,
  hvac: Thermometer,
  plumbing: ShowerHead,
  electrical: Zap,
  pest_control: Bug,
  gutter_cleaning: Droplets,
  junk_removal: Trash2,
  pool_service: Waves,
  mobile_detailing: Car,
  'tree-service': TreePine,
};

interface DbCategory {
  slug: string;
  display_name: string;
  description: string | null;
}

export default function ServiceCategories({ categories }: { categories?: DbCategory[] }) {
  // Drive the grid from service_categories when available so it can never
  // drift from the hero dropdown; static list is the no-DB fallback.
  const items =
    categories && categories.length > 0
      ? categories.map((c) => ({
          icon: SLUG_ICONS[c.slug] ?? Sparkles,
          name: c.display_name,
          description: c.description ?? '',
          searchParam: c.display_name,
        }))
      : services;

  return (
    <section className="py-20 sm:py-28 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <Image
            src="/images/boss-of-clean-logo-lg.png"
            alt="Boss of Clean"
            width={140}
            height={140}
            className="mx-auto mb-4 h-[100px] w-[100px] sm:h-[140px] sm:w-[140px]"
          />
          <p className="text-brand-gold text-sm font-semibold tracking-[0.15em] uppercase mb-3">
            Services
          </p>
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-brand-dark mb-4">
            Every Pro Service, One Marketplace
          </h2>
          <p className="text-gray-500 text-lg">
            Residential and commercial — from house cleaning to handyman work, pool service to plumbing.
            Find local Florida pros for every job.
          </p>
        </div>

        {/* Service grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6">
          {items.map((service) => (
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
