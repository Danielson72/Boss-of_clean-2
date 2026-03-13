import type { Metadata } from 'next';
import { HomePageStructuredData } from '@/components/seo';
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
  title: "Boss of Clean \u2014 Florida's Home Services Marketplace",
  description: 'Find trusted, verified home service professionals in Florida. Get free quotes for cleaning, pressure washing, landscaping, pool cleaning, and more. Purrfection is our Standard.',
  keywords: 'Florida cleaning services, home services marketplace, house cleaning Florida, pressure washing, pool cleaning, landscaping, deep cleaning, maid service, carpet cleaning, professional cleaners',
  alternates: {
    canonical: 'https://bossofclean.com',
  },
};

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <HomePageStructuredData />
      <HeroSection />
      <FloatingTools>
        <ServiceCategories />
      </FloatingTools>
      <HowItWorks />
      <ToolParticleSection />
      <ValueProposition />
      <GrowthSection />
      <TestimonialSection />
      <FloatingTools variant="alt">
        <ForProfessionals />
      </FloatingTools>
      <TrustSection />
    </div>
  );
}
