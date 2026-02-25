import { HomePageStructuredData } from '@/components/seo';
import {
  HeroSection,
  ServiceCategories,
  HowItWorks,
  ValueProposition,
  TestimonialSection,
  ForProfessionals,
  TrustSection,
} from '@/components/home';

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <HomePageStructuredData />
      <HeroSection />
      <ServiceCategories />
      <HowItWorks />
      <ValueProposition />
      <TestimonialSection />
      <ForProfessionals />
      <TrustSection />
    </div>
  );
}
