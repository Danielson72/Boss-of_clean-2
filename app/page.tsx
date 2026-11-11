import type { Metadata } from 'next';
import { HomePageStructuredData } from '@/components/seo';
import { getPublicCategories } from '@/lib/services/public-categories';
import ScrollWorldHero from '@/components/home/ScrollWorldHero';
import {
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
    "A Florida-built alternative to Thumbtack, Angi, and HomeAdvisor. Find local pros for cleaning, handyman work, HVAC, plumbing, electrical, pool service, landscaping, pressure washing, and every job your home or business needs. Free quotes. Pros set their own prices. Purrfection is our Standard.",
  keywords:
    'Florida home services, commercial cleaning Florida, office cleaning, commercial services, pro service marketplace, Thumbtack alternative, Angi alternative, HomeAdvisor alternative, house cleaning Florida, handyman Florida, pressure washing, pool cleaning, HVAC, plumbing, electrical, pest control, landscaping, gutter cleaning, junk removal, mobile car detailing, residential & commercial pros',
  alternates: {
    canonical: 'https://bossofclean.com',
  },
};

// Render per request. The ISR-cached homepage (revalidate = 3600, since #103)
// is the only public page served from the prerender cache, and the live "/"
// is answering with a 13-byte text/plain body instead of HTML (browsers see a
// blank page or a download). Every other public route is dynamic and renders
// fine, so the homepage matches them until the cache issue is understood.
export const dynamic = 'force-dynamic';

export default async function HomePage() {
  // Single taxonomy source (service_categories) for hero dropdown, services
  // grid, and the categories stat — they can no longer drift.
  const categories = await getPublicCategories();

  return (
    <div className="min-h-screen">
      <HomePageStructuredData />
      <ScrollWorldHero services={categories.map((c) => c.display_name)} />
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
