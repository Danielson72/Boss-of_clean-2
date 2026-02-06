/**
 * Service type definitions for SEO landing pages
 * Matches the service_type enum in the database
 */

export interface ServiceType {
  slug: string;
  dbValue: string; // Matches database enum value
  name: string;
  shortName: string;
  description: string;
  longDescription: string;
  priceRange: {
    min: number;
    max: number;
    unit: 'hour' | 'sqft' | 'job';
  };
  averageTime: string;
  icon: string; // Lucide icon name
  faqs: FAQ[];
  benefits: string[];
  keywords: string[];
}

export interface FAQ {
  question: string;
  answer: string;
}

export const SERVICE_TYPES: ServiceType[] = [
  {
    slug: 'residential-cleaning',
    dbValue: 'residential',
    name: 'Residential Cleaning',
    shortName: 'House Cleaning',
    description: 'Professional house cleaning services for Florida homes. Regular maintenance cleaning to keep your home spotless.',
    longDescription: 'Our residential cleaning services provide thorough, professional house cleaning for Florida homeowners. From weekly maintenance to deep cleaning, our verified cleaners handle all aspects of home cleaning including dusting, vacuuming, mopping, bathroom sanitization, and kitchen cleaning. Perfect for busy families, professionals, and anyone who wants to enjoy a clean home without the hassle.',
    priceRange: { min: 75, max: 200, unit: 'hour' },
    averageTime: '2-4 hours',
    icon: 'Home',
    benefits: [
      'Save time for what matters most',
      'Consistent, reliable cleaning schedules',
      'Customized cleaning checklists',
      'Eco-friendly product options available',
      'Background-checked, insured professionals'
    ],
    faqs: [
      {
        question: 'How much does residential cleaning cost in Florida?',
        answer: 'Residential cleaning in Florida typically costs $75-$200 depending on home size, condition, and frequency. Most cleaners charge hourly rates between $25-$50/hour with a 2-hour minimum. Regular weekly or bi-weekly service often comes with discounted rates.'
      },
      {
        question: 'What does a standard house cleaning include?',
        answer: 'A standard house cleaning includes dusting all surfaces, vacuuming carpets and rugs, mopping hard floors, cleaning and sanitizing bathrooms, kitchen cleaning (counters, appliances, sink), making beds, and emptying trash. Deep cleaning services add baseboards, inside appliances, and detailed attention to high-touch areas.'
      },
      {
        question: 'How often should I have my house professionally cleaned?',
        answer: 'Most Florida homeowners choose bi-weekly cleaning for optimal maintenance. Weekly cleaning is ideal for busy households, homes with pets, or those with allergies. Monthly cleaning works for smaller homes or those who maintain regularly between visits.'
      },
      {
        question: 'Do I need to be home during the cleaning?',
        answer: 'No, most clients provide a key or entry code. All Boss of Clean verified cleaners are background-checked and insured. Many homeowners prefer to be away during cleaning so cleaners can work efficiently without disruption.'
      },
      {
        question: 'Are cleaning supplies included?',
        answer: 'Most professional cleaners bring their own supplies and equipment. If you prefer specific products (eco-friendly, hypoallergenic, or particular brands), discuss this during booking. Some cleaners offer to use your supplies at a slightly reduced rate.'
      }
    ],
    keywords: ['house cleaning Florida', 'residential cleaning services', 'home cleaning', 'maid service Florida', 'housekeeping services']
  },
  {
    slug: 'commercial-cleaning',
    dbValue: 'commercial',
    name: 'Commercial Cleaning',
    shortName: 'Office Cleaning',
    description: 'Professional commercial cleaning for Florida businesses. Keep your workplace clean and your employees healthy.',
    longDescription: 'Our commercial cleaning services keep Florida businesses spotless and professional. From small offices to large commercial spaces, our verified cleaning professionals handle daily janitorial services, floor care, restroom sanitation, and specialized commercial cleaning needs. Create a healthier workplace and impress clients with a consistently clean business environment.',
    priceRange: { min: 100, max: 500, unit: 'job' },
    averageTime: '2-8 hours',
    icon: 'Building2',
    benefits: [
      'Healthier workplace environment',
      'Professional appearance for clients',
      'Flexible scheduling (nights/weekends)',
      'Reduces sick days and absenteeism',
      'Customized cleaning contracts'
    ],
    faqs: [
      {
        question: 'How much does commercial cleaning cost in Florida?',
        answer: 'Commercial cleaning costs vary by space size and frequency. Small offices (under 2,000 sq ft) typically cost $100-$200 per visit. Larger spaces are often priced per square foot ($0.05-$0.20/sqft). Most businesses opt for daily or weekly service with monthly contracts.'
      },
      {
        question: 'What commercial spaces do you clean?',
        answer: 'Our verified cleaners handle all types of commercial properties including offices, retail stores, medical facilities, restaurants, gyms, churches, schools, and industrial spaces. Specialized cleaning for medical or food service facilities is available with certified professionals.'
      },
      {
        question: 'Can cleaning be done after business hours?',
        answer: 'Yes! Most commercial cleaning is performed during evening or early morning hours to avoid disrupting business operations. Weekend cleaning is also available. Scheduling is flexible to meet your business needs.'
      },
      {
        question: 'Do you offer contract cleaning services?',
        answer: 'Yes, most commercial cleaners offer monthly or annual contracts with significant savings over one-time service. Contracts include guaranteed service levels, consistent crews, and priority scheduling.'
      },
      {
        question: 'Are your commercial cleaners insured?',
        answer: 'All Boss of Clean verified commercial cleaners carry liability insurance and workers compensation. This protects your business from any damages or injuries that may occur during cleaning.'
      }
    ],
    keywords: ['commercial cleaning Florida', 'office cleaning services', 'janitorial services', 'business cleaning', 'workplace cleaning']
  },
  {
    slug: 'deep-cleaning',
    dbValue: 'deep_cleaning',
    name: 'Deep Cleaning',
    shortName: 'Deep Clean',
    description: 'Intensive deep cleaning services for Florida homes. Perfect for spring cleaning or first-time cleanings.',
    longDescription: 'Deep cleaning goes beyond regular maintenance to tackle built-up dirt, grime, and neglected areas. Our Florida deep cleaning professionals thoroughly clean inside appliances, behind furniture, baseboards, light fixtures, window tracks, and every corner of your home. Ideal for first-time cleanings, spring cleaning, post-illness sanitization, or preparing your home for special occasions.',
    priceRange: { min: 150, max: 400, unit: 'job' },
    averageTime: '4-8 hours',
    icon: 'Sparkles',
    benefits: [
      'Removes built-up dirt and grime',
      'Sanitizes high-touch surfaces',
      'Reaches neglected areas',
      'Perfect fresh start for regular cleaning',
      'Improves indoor air quality'
    ],
    faqs: [
      {
        question: 'What is the difference between deep cleaning and regular cleaning?',
        answer: 'Deep cleaning is more thorough and time-intensive than regular cleaning. It includes cleaning inside appliances (oven, refrigerator), behind furniture, baseboards, light fixtures, window tracks, inside cabinets, and detailed bathroom tile/grout cleaning. Regular cleaning maintains surface cleanliness while deep cleaning tackles accumulated dirt.'
      },
      {
        question: 'How often should I schedule deep cleaning?',
        answer: 'Most homes benefit from deep cleaning 2-4 times per year, typically aligned with seasons. If you have regular cleaning service, quarterly deep cleans are sufficient. Without regular service, bi-monthly deep cleans may be needed depending on lifestyle and household size.'
      },
      {
        question: 'How long does a deep cleaning take?',
        answer: 'Deep cleaning typically takes 4-8 hours depending on home size and condition. A 3-bedroom home in average condition takes about 5-6 hours. Homes that havent been professionally cleaned may require 8+ hours for the initial deep clean.'
      },
      {
        question: 'Should I deep clean before starting regular cleaning service?',
        answer: 'Yes! Starting with a deep clean allows regular maintenance cleanings to be more effective. Its like resetting your home to a baseline of cleanliness that regular service can then maintain efficiently.'
      },
      {
        question: 'What should I do to prepare for a deep cleaning?',
        answer: 'Declutter surfaces as much as possible, put away personal valuables, and make a list of priority areas. Communicate any specific concerns like pet areas, allergies, or surfaces requiring special care. The cleaner the home can work, the more thorough the deep clean.'
      }
    ],
    keywords: ['deep cleaning Florida', 'intensive cleaning', 'spring cleaning services', 'detailed house cleaning', 'thorough cleaning']
  },
  {
    slug: 'pressure-washing',
    dbValue: 'pressure_washing',
    name: 'Pressure Washing',
    shortName: 'Power Washing',
    description: 'Professional pressure washing for Florida homes and businesses. Remove mold, mildew, and stains from exterior surfaces.',
    longDescription: 'Florida humidity creates the perfect environment for mold, mildew, and algae growth on exterior surfaces. Our professional pressure washing services restore driveways, sidewalks, patios, pool decks, siding, roofs, and fences to like-new condition. Protect your property value and curb appeal with regular pressure washing from verified Florida professionals.',
    priceRange: { min: 100, max: 500, unit: 'job' },
    averageTime: '2-6 hours',
    icon: 'Droplets',
    benefits: [
      'Removes mold, mildew, and algae',
      'Increases property curb appeal',
      'Prevents surface deterioration',
      'Prepares surfaces for painting/sealing',
      'Essential for Florida climate maintenance'
    ],
    faqs: [
      {
        question: 'How much does pressure washing cost in Florida?',
        answer: 'Pressure washing costs vary by surface. Driveways typically cost $80-$200, full house washing $200-$500, and roof cleaning $300-$600. Pool decks run $100-$250. Most companies charge by square footage or offer package deals for multiple surfaces.'
      },
      {
        question: 'How often should I pressure wash in Florida?',
        answer: 'Due to Floridas humid climate, pressure washing 1-2 times per year is recommended. High-traffic areas like driveways may need more frequent cleaning. Shaded areas prone to mold/mildew may benefit from quarterly cleaning.'
      },
      {
        question: 'Will pressure washing damage my surfaces?',
        answer: 'When done correctly by professionals, pressure washing is safe for most surfaces. Experienced cleaners adjust pressure levels and use appropriate techniques for each surface type. Delicate surfaces like roof tiles require soft washing with lower pressure.'
      },
      {
        question: 'Can pressure washing remove oil stains from my driveway?',
        answer: 'Yes, professional pressure washing combined with degreasers can remove most oil stains. Fresh stains are easier to remove than set-in ones. Heavily stained areas may require multiple treatments or specialized cleaning solutions.'
      },
      {
        question: 'Is soft washing different from pressure washing?',
        answer: 'Yes, soft washing uses lower pressure with specialized cleaning solutions to safely clean delicate surfaces like roofs, stucco, and painted siding. Pressure washing uses high pressure for concrete, brick, and other hard surfaces. Professional cleaners know which method to use.'
      }
    ],
    keywords: ['pressure washing Florida', 'power washing services', 'driveway cleaning', 'exterior cleaning', 'mold removal']
  },
  {
    slug: 'window-cleaning',
    dbValue: 'window_cleaning',
    name: 'Window Cleaning',
    shortName: 'Window Wash',
    description: 'Professional window cleaning for Florida homes and businesses. Crystal-clear windows inside and out.',
    longDescription: 'Florida sun, salt air, and seasonal pollen quickly cloud your windows. Our professional window cleaners deliver streak-free results for residential and commercial properties. Services include interior and exterior window cleaning, screen cleaning, track and sill cleaning, and high-rise window washing. See Florida sunshine clearly through spotless windows.',
    priceRange: { min: 75, max: 300, unit: 'job' },
    averageTime: '2-4 hours',
    icon: 'RectangleHorizontal',
    benefits: [
      'Streak-free, crystal-clear results',
      'Extends window lifespan',
      'Improves natural light',
      'Enhances curb appeal',
      'Removes salt air and pollen buildup'
    ],
    faqs: [
      {
        question: 'How much does window cleaning cost in Florida?',
        answer: 'Window cleaning typically costs $4-$8 per pane for standard windows or $150-$400 for a whole house. Pricing depends on window count, size, accessibility, and whether interior/exterior cleaning is needed. High windows or specialty glass may cost more.'
      },
      {
        question: 'How often should I have my windows professionally cleaned?',
        answer: 'In Florida, quarterly window cleaning is ideal due to pollen, humidity, and coastal salt air. At minimum, twice-yearly cleaning (spring and fall) keeps windows looking good. Commercial properties may need monthly cleaning for appearance.'
      },
      {
        question: 'Do you clean both inside and outside?',
        answer: 'Most window cleaning services include both interior and exterior cleaning. Some homeowners opt for exterior-only service if interiors are easily accessible. Pricing typically includes both, with exterior-only being slightly less.'
      },
      {
        question: 'Can you clean windows on a multi-story home?',
        answer: 'Yes, professional window cleaners have equipment for multi-story buildings including extension poles, ladders, and water-fed pole systems. High-rise commercial buildings may require specialized equipment and trained technicians.'
      },
      {
        question: 'Do you clean screens and tracks?',
        answer: 'Most professional window cleaning includes screen and track cleaning as part of the service. Screens are removed, washed, and reinstalled. Tracks are vacuumed and wiped clean. Confirm this is included when booking.'
      }
    ],
    keywords: ['window cleaning Florida', 'window washing services', 'glass cleaning', 'screen cleaning', 'professional window cleaners']
  },
  {
    slug: 'carpet-cleaning',
    dbValue: 'carpet_cleaning',
    name: 'Carpet Cleaning',
    shortName: 'Carpet Care',
    description: 'Professional carpet cleaning services in Florida. Deep clean, stain removal, and carpet restoration.',
    longDescription: 'Floridas humidity and foot traffic take a toll on carpets. Our professional carpet cleaning services use hot water extraction (steam cleaning), dry cleaning, and specialized stain removal to restore your carpets. Services include whole-house carpet cleaning, area rug cleaning, upholstery cleaning, and pet stain/odor treatment. Extend carpet life and improve indoor air quality with professional cleaning.',
    priceRange: { min: 75, max: 300, unit: 'job' },
    averageTime: '2-4 hours',
    icon: 'LayoutGrid',
    benefits: [
      'Removes deep-set dirt and allergens',
      'Eliminates stains and odors',
      'Extends carpet lifespan',
      'Improves indoor air quality',
      'Pet stain and odor treatment available'
    ],
    faqs: [
      {
        question: 'How much does carpet cleaning cost in Florida?',
        answer: 'Carpet cleaning typically costs $25-$75 per room or $0.15-$0.30 per square foot. A 3-bedroom home averages $150-$300. Stairs add $2-$4 per step. Heavy staining, pet treatment, or specialty services cost extra.'
      },
      {
        question: 'How long does carpet cleaning take to dry?',
        answer: 'Steam-cleaned carpets typically dry in 6-12 hours, though Floridas humidity can extend this to 24 hours. Using fans and AC helps speed drying. Dry cleaning methods have minimal drying time (1-2 hours).'
      },
      {
        question: 'How often should carpets be professionally cleaned?',
        answer: 'Most carpet manufacturers recommend professional cleaning every 12-18 months. Homes with pets, children, allergies, or high traffic benefit from cleaning every 6-12 months. Regular vacuuming extends time between professional cleanings.'
      },
      {
        question: 'Can you remove pet stains and odors?',
        answer: 'Yes, professional carpet cleaners have enzyme treatments and specialized equipment for pet stains. Fresh stains are easier to treat than set-in ones. Severe urine damage may require carpet pad replacement. Be upfront about pet accidents when booking.'
      },
      {
        question: 'Is steam cleaning or dry cleaning better?',
        answer: 'Steam cleaning (hot water extraction) provides deeper cleaning and is recommended by most carpet manufacturers. Dry cleaning is faster-drying and good for maintenance between steam cleans. Your cleaner can recommend the best method for your situation.'
      }
    ],
    keywords: ['carpet cleaning Florida', 'steam cleaning', 'carpet stain removal', 'upholstery cleaning', 'rug cleaning']
  },
  {
    slug: 'move-in-out-cleaning',
    dbValue: 'move_in_out',
    name: 'Move In/Out Cleaning',
    shortName: 'Moving Clean',
    description: 'Thorough move-in and move-out cleaning services in Florida. Get your deposit back or start fresh in your new home.',
    longDescription: 'Moving is stressful enough without worrying about cleaning. Our move-in/move-out cleaning services ensure you get your security deposit back or start fresh in a spotless new home. We clean empty homes from top to bottom including inside cabinets, appliances, closets, and all those spots hidden by furniture. Florida landlords and property managers trust our thorough move-out cleaning.',
    priceRange: { min: 150, max: 400, unit: 'job' },
    averageTime: '4-8 hours',
    icon: 'PackageOpen',
    benefits: [
      'Get your security deposit back',
      'Start fresh in a clean home',
      'Thorough empty-home cleaning',
      'Inside cabinets and appliances',
      'Behind and under where furniture was'
    ],
    faqs: [
      {
        question: 'What is included in move-out cleaning?',
        answer: 'Move-out cleaning includes all standard cleaning plus: inside all cabinets and drawers, inside oven and refrigerator, window sills and tracks, light fixtures, baseboards, inside closets, and cleaning behind/under where furniture was. Its the most thorough cleaning service available.'
      },
      {
        question: 'How much does move-out cleaning cost in Florida?',
        answer: 'Move-out cleaning typically costs $200-$400 for standard homes. Pricing depends on size, condition, and whether appliance cleaning is included. Heavily soiled homes or those needing repairs may cost more. Get a quote after move-out for accurate pricing.'
      },
      {
        question: 'Should I clean before or after moving out?',
        answer: 'Schedule cleaning after all belongings are removed. Empty homes are faster and easier to clean thoroughly. Most cleaners offer scheduling within 24-48 hours of your move-out date to accommodate timing with landlord inspections.'
      },
      {
        question: 'Will move-out cleaning guarantee my deposit back?',
        answer: 'A professional move-out clean significantly improves your chances of full deposit return. While we cant guarantee landlord decisions, documented professional cleaning shows good faith. Some landlords specify requirements we can match or exceed.'
      },
      {
        question: 'Do you offer move-in cleaning for new homes?',
        answer: 'Yes! Move-in cleaning ensures your new home is truly clean before you unpack. Even new construction or recently cleaned rentals benefit from thorough sanitization. Its easier to clean before furniture arrives.'
      }
    ],
    keywords: ['move out cleaning Florida', 'move in cleaning', 'rental cleaning', 'deposit cleaning', 'end of lease cleaning']
  },
  {
    slug: 'post-construction-cleaning',
    dbValue: 'post_construction',
    name: 'Post-Construction Cleaning',
    shortName: 'Construction Clean',
    description: 'Specialized post-construction and renovation cleaning in Florida. Remove dust, debris, and make your project shine.',
    longDescription: 'Construction and renovation projects leave behind dust, debris, and materials that regular cleaning cant handle. Our post-construction cleaning professionals remove construction dust from every surface, clean windows and fixtures, remove adhesive residue, and prepare your newly built or renovated space for occupancy. Essential for builders, contractors, and homeowners completing Florida construction projects.',
    priceRange: { min: 200, max: 800, unit: 'job' },
    averageTime: '6-12 hours',
    icon: 'HardHat',
    benefits: [
      'Removes fine construction dust',
      'Cleans windows and glass surfaces',
      'Removes adhesive and paint residue',
      'Prepares space for occupancy',
      'Multiple-phase cleaning available'
    ],
    faqs: [
      {
        question: 'What phases of post-construction cleaning are there?',
        answer: 'Post-construction cleaning typically has three phases: 1) Rough clean after framing/drywall removes bulk debris; 2) Final clean after finishing work removes fine dust; 3) Touch-up clean before occupancy addresses any remaining issues. Depending on project, all phases or just final may be needed.'
      },
      {
        question: 'How much does post-construction cleaning cost?',
        answer: 'Post-construction cleaning costs $0.15-$0.50 per square foot depending on condition and phase needed. A 2,000 sq ft home typically costs $400-$800 for final cleaning. New construction is usually less than renovation cleanup due to better conditions.'
      },
      {
        question: 'How is post-construction cleaning different from regular cleaning?',
        answer: 'Post-construction cleaning requires specialized equipment and techniques for construction dust, which is finer and more pervasive than normal dirt. It includes removing stickers and labels, cleaning newly installed fixtures, and often multiple passes to capture settling dust.'
      },
      {
        question: 'When should I schedule post-construction cleaning?',
        answer: 'Schedule final cleaning after all construction is complete, including painting, fixture installation, and flooring. Allow 24-48 hours after painting for proper curing. Coordinate with your contractor on timing for best results.'
      },
      {
        question: 'Do you clean HVAC vents after construction?',
        answer: 'Basic post-construction cleaning includes cleaning vent covers and accessible ducts. For thorough HVAC cleaning, we recommend professional duct cleaning services. Construction dust in HVAC systems should be addressed before running the system extensively.'
      }
    ],
    keywords: ['post construction cleaning Florida', 'builder cleaning', 'new construction cleaning', 'renovation cleanup', 'construction dust removal']
  },
  {
    slug: 'maid-service',
    dbValue: 'maid_service',
    name: 'Maid Service',
    shortName: 'Maid Service',
    description: 'Professional recurring maid service in Florida. Reliable, scheduled home cleaning you can count on.',
    longDescription: 'Our maid service provides consistent, reliable home cleaning on your schedule. Unlike one-time cleaning, maid service builds a relationship with your home over time, ensuring nothing is missed and preferences are remembered. Choose weekly, bi-weekly, or monthly service with the same trusted cleaner. Perfect for busy Florida families and professionals who want a consistently clean home without the hassle.',
    priceRange: { min: 100, max: 250, unit: 'job' },
    averageTime: '2-4 hours',
    icon: 'CalendarCheck',
    benefits: [
      'Same cleaner learns your home',
      'Consistent, reliable scheduling',
      'Customized cleaning checklists',
      'Flexible frequency options',
      'Priority booking for regular clients'
    ],
    faqs: [
      {
        question: 'What is the difference between maid service and house cleaning?',
        answer: 'Maid service typically refers to recurring scheduled cleaning with the same cleaner(s) who learn your homes specific needs and preferences. House cleaning may be one-time or recurring. Maid service often includes additional perks like priority scheduling and consistent quality.'
      },
      {
        question: 'How often should I schedule maid service?',
        answer: 'Most Florida homes choose bi-weekly maid service for optimal maintenance at reasonable cost. Weekly service is ideal for large families, homes with pets, or those with allergies. Monthly service works for smaller homes or as supplement to your own cleaning.'
      },
      {
        question: 'Will I have the same cleaner each time?',
        answer: 'Most maid services assign a primary cleaner to your home who handles most visits. Having the same person learn your home and preferences improves quality over time. Backup cleaners may fill in occasionally for vacations or illness.'
      },
      {
        question: 'Can I customize what gets cleaned each visit?',
        answer: 'Yes! Professional maid services work with you to create a customized checklist for your home. You can specify priority areas, off-limits items, preferred products, and special instructions. Regular communication ensures ongoing satisfaction.'
      },
      {
        question: 'What if Im not satisfied with a cleaning?',
        answer: 'Reputable maid services offer satisfaction guarantees. If you notice issues after a cleaning, contact the service within 24 hours for a re-clean of problem areas at no charge. Ongoing feedback helps improve service quality.'
      }
    ],
    keywords: ['maid service Florida', 'recurring house cleaning', 'scheduled cleaning service', 'regular maid', 'weekly cleaning']
  },
  {
    slug: 'office-cleaning',
    dbValue: 'office_cleaning',
    name: 'Office Cleaning',
    shortName: 'Office Clean',
    description: 'Professional office cleaning services in Florida. Daily, weekly, or monthly janitorial services for your business.',
    longDescription: 'Keep your Florida office clean, healthy, and professional with our office cleaning services. From small professional suites to large corporate offices, our verified cleaners provide daily janitorial services, restroom sanitation, break room cleaning, and specialized office cleaning needs. Create a productive work environment and impress clients with spotless office spaces.',
    priceRange: { min: 75, max: 400, unit: 'job' },
    averageTime: '1-4 hours',
    icon: 'Briefcase',
    benefits: [
      'Healthier work environment',
      'Reduced employee sick days',
      'Professional client impressions',
      'Flexible after-hours scheduling',
      'Customized to office needs'
    ],
    faqs: [
      {
        question: 'How much does office cleaning cost?',
        answer: 'Office cleaning costs vary by size and frequency. Small offices (1,000-2,000 sq ft) typically cost $75-$150 per visit. Larger offices price at $0.05-$0.15 per square foot. Daily service costs more than weekly but often includes volume discounts.'
      },
      {
        question: 'What does standard office cleaning include?',
        answer: 'Standard office cleaning includes: emptying trash and recycling, vacuuming/mopping floors, dusting surfaces, cleaning restrooms, wiping down common areas, cleaning break rooms, and sanitizing high-touch surfaces (doorknobs, light switches, etc.).'
      },
      {
        question: 'Do you clean during business hours or after?',
        answer: 'Most office cleaning occurs after business hours to avoid disrupting work. Evening cleaning (after 6pm) is most common. Some offices prefer early morning service before employees arrive. Discuss scheduling during your consultation.'
      },
      {
        question: 'How do we handle office security during cleaning?',
        answer: 'Professional cleaners are background-checked and trained in office security protocols. We work with your building management on key/access procedures. Cleaners follow sign-in/sign-out procedures and alarm codes as needed.'
      },
      {
        question: 'Can you clean specialized office equipment?',
        answer: 'Standard office cleaning includes wiping down keyboards, phones, and monitors. Specialized equipment (medical, laboratory, IT server rooms) may require specific cleaning protocols. Discuss specialized needs during consultation.'
      }
    ],
    keywords: ['office cleaning Florida', 'janitorial services', 'commercial office cleaning', 'workplace cleaning', 'business cleaning services']
  },
  {
    slug: 'pool-cleaning',
    dbValue: 'pool_cleaning',
    name: 'Pool Cleaning Services',
    shortName: 'Pool Cleaning',
    description: 'Professional pool cleaning and maintenance services across Florida. Keep your pool crystal clear year-round.',
    longDescription: 'Florida pool cleaning services to keep your swimming pool sparkling and safe. Our verified pool professionals handle chemical balancing, skimming, vacuuming, filter cleaning, equipment inspection, and seasonal maintenance. With Florida\'s year-round swimming season, regular pool maintenance is essential to prevent algae, maintain water clarity, and extend the life of your pool equipment.',
    priceRange: { min: 80, max: 250, unit: 'job' },
    averageTime: '1-2 hours',
    icon: 'Waves',
    benefits: [
      'Year-round crystal clear water',
      'Proper chemical balance for safe swimming',
      'Extended equipment lifespan',
      'Algae and debris prevention',
      'Licensed and insured pool technicians'
    ],
    faqs: [
      {
        question: 'How much does pool cleaning cost in Florida?',
        answer: 'Regular weekly pool service typically costs $80-$150/month in Florida. One-time deep cleanings range from $150-$250 depending on pool size and condition. Green-to-clean services for neglected pools can cost $250-$500.'
      },
      {
        question: 'How often should I have my pool cleaned in Florida?',
        answer: 'In Florida\'s warm climate, weekly pool service is recommended year-round. Heavy rain, pollen, and leaf seasons may require more frequent attention. At minimum, chemical levels should be checked 2-3 times per week.'
      },
      {
        question: 'What does regular pool maintenance include?',
        answer: 'Standard weekly service includes skimming the surface, vacuuming the pool floor, brushing walls and tiles, emptying baskets, testing and balancing chemicals, checking equipment, and cleaning the waterline.'
      }
    ],
    keywords: ['pool cleaning Florida', 'pool maintenance', 'swimming pool service', 'pool chemical balancing', 'pool technician']
  },
  {
    slug: 'landscaping',
    dbValue: 'landscaping',
    name: 'Landscaping Services',
    shortName: 'Landscaping',
    description: 'Professional landscaping and lawn care services in Florida. Lawn mowing, hedge trimming, garden maintenance, and more.',
    longDescription: 'Florida landscaping services to keep your property looking its best year-round. Our verified landscaping professionals handle lawn mowing, edging, hedge trimming, weed control, mulching, garden bed maintenance, tree trimming, and seasonal plantings. Florida\'s unique subtropical climate requires specialized knowledge of local plants, irrigation, and pest management.',
    priceRange: { min: 50, max: 300, unit: 'job' },
    averageTime: '1-4 hours',
    icon: 'TreePine',
    benefits: [
      'Boost curb appeal and property value',
      'Expert knowledge of Florida plants',
      'Consistent weekly/biweekly maintenance',
      'Proper irrigation management',
      'Licensed and insured professionals'
    ],
    faqs: [
      {
        question: 'How much does landscaping cost in Florida?',
        answer: 'Basic lawn mowing starts at $30-$60 per visit for standard lots. Full landscaping maintenance including mowing, edging, trimming, and blowing ranges from $100-$300/month depending on property size and services included.'
      },
      {
        question: 'How often should I mow my lawn in Florida?',
        answer: 'During Florida\'s growing season (spring through fall), lawns should be mowed weekly. In winter, biweekly mowing is usually sufficient. St. Augustine and Bermuda grass, common in Florida, grow quickly in warm months.'
      },
      {
        question: 'Do you handle irrigation systems?',
        answer: 'Many of our landscaping professionals can inspect, adjust, and perform basic maintenance on irrigation systems. For complex repairs or new installations, specialized irrigation companies are recommended.'
      }
    ],
    keywords: ['landscaping Florida', 'lawn care', 'yard maintenance', 'lawn mowing service', 'garden maintenance']
  },
  {
    slug: 'mobile-car-detailing',
    dbValue: 'mobile_car_detailing',
    name: 'Mobile Car Detailing',
    shortName: 'Car Detailing',
    description: 'Professional mobile car detailing services in Florida. Interior and exterior detailing at your location.',
    longDescription: 'Mobile car detailing services that come to your home or office in Florida. Our professional detailers provide thorough interior and exterior cleaning including hand wash, clay bar treatment, polish, wax, interior vacuuming, leather conditioning, dashboard detailing, and paint correction. Perfect for Florida\'s harsh sun and salt air that can damage vehicle finishes.',
    priceRange: { min: 75, max: 350, unit: 'job' },
    averageTime: '2-5 hours',
    icon: 'Car',
    benefits: [
      'Convenient mobile service at your location',
      'Protection from Florida sun and salt damage',
      'Professional-grade products and tools',
      'Interior sanitization and deodorizing',
      'Paint correction and ceramic coating options'
    ],
    faqs: [
      {
        question: 'How much does mobile car detailing cost in Florida?',
        answer: 'Basic exterior hand wash and interior detail starts at $75-$150. Full detail packages including paint correction, clay bar, and ceramic coating range from $200-$350 for sedans and $250-$450 for SUVs and trucks.'
      },
      {
        question: 'How often should I detail my car in Florida?',
        answer: 'In Florida\'s harsh conditions, a full detail every 3-4 months is recommended. Monthly maintenance washes help protect your investment between details. Cars parked outdoors may need more frequent service due to UV exposure and bird droppings.'
      },
      {
        question: 'Do mobile detailers need water access at my location?',
        answer: 'Most mobile detailers bring their own water supply (typically 50-100 gallons). Some may request access to an outdoor spigot for rinsing. Waterless and eco-friendly options are available for locations without water access.'
      }
    ],
    keywords: ['mobile car detailing Florida', 'auto detailing', 'car wash service', 'vehicle detailing', 'paint correction']
  },
  {
    slug: 'air-duct-cleaning',
    dbValue: 'air_duct_cleaning',
    name: 'Air Duct Cleaning',
    shortName: 'Air Duct Cleaning',
    description: 'Professional air duct and HVAC cleaning services in Florida. Improve air quality and system efficiency.',
    longDescription: 'Air duct cleaning services to improve indoor air quality in Florida homes and businesses. Our certified technicians remove dust, mold, allergens, and debris from your HVAC system using professional-grade equipment. In Florida\'s humid climate, ductwork is prone to mold growth and allergen buildup, making regular cleaning essential for healthy indoor air and optimal AC efficiency.',
    priceRange: { min: 200, max: 600, unit: 'job' },
    averageTime: '3-5 hours',
    icon: 'Wind',
    benefits: [
      'Improved indoor air quality',
      'Reduced allergens and mold',
      'Better HVAC efficiency and lower energy bills',
      'Essential for Florida humidity and mold prevention',
      'NADCA-certified technicians'
    ],
    faqs: [
      {
        question: 'How much does air duct cleaning cost in Florida?',
        answer: 'Air duct cleaning for a typical Florida home (1,500-2,500 sq ft) costs $200-$400. Larger homes or commercial properties range from $400-$600+. Mold remediation or sanitization treatments are additional $100-$200.'
      },
      {
        question: 'How often should air ducts be cleaned in Florida?',
        answer: 'In Florida\'s humid climate, air duct cleaning is recommended every 2-3 years. Homes with pets, allergies, recent renovations, or visible mold should clean more frequently. Annual inspections help determine when cleaning is needed.'
      },
      {
        question: 'Does duct cleaning help with Florida mold issues?',
        answer: 'Yes, air duct cleaning removes mold spores and prevents their spread through your HVAC system. Combined with proper humidity control (keeping indoor humidity below 60%), clean ducts significantly reduce mold-related health risks in Florida homes.'
      }
    ],
    keywords: ['air duct cleaning Florida', 'HVAC cleaning', 'duct cleaning service', 'indoor air quality', 'mold removal ducts']
  },
  {
    slug: 'str-turnover-cleaning',
    dbValue: 'str_turnover',
    name: 'STR Turnover Cleaning',
    shortName: 'Airbnb Cleaning',
    description: 'Professional short-term rental turnover cleaning for Airbnb, VRBO, and vacation rental hosts in Florida.',
    longDescription: 'Fast, reliable turnover cleaning for Florida short-term rental hosts. Our verified STR cleaning professionals specialize in same-day turnovers between guests, ensuring your Airbnb, VRBO, or vacation rental is guest-ready every time. Services include full cleaning, linen changes, restocking amenities, damage inspection, and photo-ready staging. Built for property managers handling multiple units with tight checkout-to-checkin windows.',
    priceRange: { min: 100, max: 350, unit: 'job' },
    averageTime: '2-4 hours',
    icon: 'KeyRound',
    benefits: [
      'Same-day turnovers between guests',
      'Linen change and laundry service',
      'Amenity restocking and staging',
      'Damage and maintenance reporting',
      'Consistent checklist-based cleaning',
      'Multi-property management support'
    ],
    faqs: [
      {
        question: 'How much does Airbnb turnover cleaning cost in Florida?',
        answer: 'STR turnover cleaning in Florida typically costs $100-$250 for a 1-2 bedroom unit and $200-$350 for larger properties. Pricing depends on property size, number of bedrooms/bathrooms, and whether linen service is included. Most hosts pass the cleaning fee to guests through their platform.'
      },
      {
        question: 'How quickly can you turn over a rental between guests?',
        answer: 'Most turnovers are completed within 2-4 hours depending on property size. Our cleaners are experienced with tight checkout-to-checkin windows and can handle same-day turnovers. For back-to-back bookings, we recommend scheduling at least a 4-hour gap between checkout and checkin.'
      },
      {
        question: 'What does an STR turnover cleaning include?',
        answer: 'A standard turnover includes full cleaning of all rooms, bathroom sanitization, kitchen cleaning, linen and towel changes, trash removal, amenity restocking (toiletries, coffee, etc.), dishwasher unloading, and a walkthrough to ensure the property is guest-ready. Many cleaners also provide a photo report confirming the property is staged correctly.'
      },
      {
        question: 'Do you handle linen laundry for vacation rentals?',
        answer: 'Many STR cleaners offer linen service — either laundering on-site, swapping with a clean set, or coordinating with a laundry service. Linen swap is the fastest option for tight turnovers. Discuss your preferred approach when booking.'
      },
      {
        question: 'Can you manage cleaning for multiple rental properties?',
        answer: 'Yes! Many of our cleaners specialize in managing turnover schedules for hosts and property managers with multiple units. They can coordinate across properties, maintain consistent quality with standardized checklists, and handle last-minute booking changes.'
      }
    ],
    keywords: ['Airbnb cleaning Florida', 'VRBO cleaning service', 'vacation rental turnover', 'STR cleaning', 'short-term rental cleaning', 'Airbnb turnover cleaning']
  }
];

/**
 * Get service type by slug
 */
export function getServiceTypeBySlug(slug: string): ServiceType | undefined {
  return SERVICE_TYPES.find(service => service.slug === slug);
}

/**
 * Get service type by database value
 */
export function getServiceTypeByDbValue(dbValue: string): ServiceType | undefined {
  return SERVICE_TYPES.find(service => service.dbValue === dbValue);
}

/**
 * Get all service type slugs for static generation
 */
export function getAllServiceTypeSlugs(): string[] {
  return SERVICE_TYPES.map(service => service.slug);
}

/**
 * Map database service type to display name
 */
export function getServiceDisplayName(dbValue: string): string {
  const service = getServiceTypeByDbValue(dbValue);
  return service?.shortName || dbValue.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

/**
 * Map display name to database value
 */
export function getServiceDbValue(displayName: string): string | undefined {
  // First try exact match on shortName
  const byShortName = SERVICE_TYPES.find(s =>
    s.shortName.toLowerCase() === displayName.toLowerCase()
  );
  if (byShortName) return byShortName.dbValue;

  // Then try name
  const byName = SERVICE_TYPES.find(s =>
    s.name.toLowerCase() === displayName.toLowerCase()
  );
  if (byName) return byName.dbValue;

  // Then try slug
  const bySlug = SERVICE_TYPES.find(s =>
    s.slug === displayName.toLowerCase().replace(/\s+/g, '-')
  );
  if (bySlug) return bySlug.dbValue;

  return undefined;
}
