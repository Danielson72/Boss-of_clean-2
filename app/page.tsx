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
} from '@/components/home';

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <HomePageStructuredData />
      <HeroSection />
      <FloatingTools>
        <ServiceCategories />
      </FloatingTools>
      <HowItWorks />
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
