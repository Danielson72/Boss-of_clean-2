import type { Metadata } from 'next';
import { HomePageStructuredData } from '@/components/seo';
import { getPublicCategories } from '@/lib/services/public-categories';
import {
  HeroSection,
  ServiceCategories,
  HowItWorks,
  ValueProposition,
  GrowthSection,
  TestimonialSection,
  ForProfessionals,
  TrustSection,
  FloatingTools,
  ToolParticleSection,
} from '@/components/home';

export const metadata: Metadata = {
  title: "Boss of Clean \u2014 Florida's Pro Service Marketplace",
  description:
    "Florida's fair, transparent alternative to Thumbtack, Angi, and HomeAdvisor. Find vetted pros for cleaning, handyman work, HVAC, plumbing, electrical, pool service, landscaping, pressure washing, and every job your home or business needs. Free quotes. Direct connections. Purrfection is our Standard.",
  keywords:
    'Florida home services, pro service marketplace, Thumbtack alternative, Angi alternative, HomeAdvisor alternative, house cleaning Florida, handyman Florida, pressure washing, pool cleaning, HVAC, plumbing, electrical, pest control, landscaping, gutter cleaning, junk removal, mobile car detailing, residential pros',
  alternates: {
    canonical: 'https://bossofclean.com',
  },
};

// Taxonomy changes rarely — cache the page and refresh hourly.
export const revalidate = 3600;

export default async function HomePage() {
  // Single taxonomy source (service_categories) for hero dropdown, services
  // grid, and the categories stat — they can no longer drift.
  const categories = await getPublicCategories();

  return (
    <div className="min-h-screen">
      <HomePageStructuredData />
      <HeroSection services={categories.map((c) => c.display_name)} />
      <FloatingTools>
        <ServiceCategories categories={categories} />
      </FloatingTools>
      <HowItWorks />
      <ToolParticleSection />
      <ValueProposition />
      <GrowthSection categoriesCount={categories.length || 14} />
      <TestimonialSection />
      <FloatingTools variant="alt">
        <ForProfessionals />
      </FloatingTools>
      <TrustSection />
    </div>
  );
}
