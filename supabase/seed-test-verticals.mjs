/**
 * Seed test cleaner profiles for new service verticals:
 * - Pool cleaning (Orlando, Tampa)
 * - Landscaping (Miami, Jacksonville)
 * - Car detailing (statewide)
 * - Air duct cleaning (major metros)
 *
 * Usage: node supabase/seed-test-verticals.mjs
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY and NEXT_PUBLIC_SUPABASE_URL in .env.local
 */

import { readFileSync } from 'fs'
import { randomUUID } from 'crypto'

// Load env
const envContent = readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
const env = {}
envContent.split('\n').forEach(line => {
  const match = line.match(/^([^#=]+)=(.*)$/)
  if (match) env[match[1].trim()] = match[2].trim()
})

const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const headers = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json',
  Prefer: 'return=representation',
}

async function supabasePost(table, data) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`POST ${table} failed (${res.status}): ${err}`)
  }
  return res.json()
}

async function supabaseUpsert(table, data) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: { ...headers, Prefer: 'return=representation,resolution=merge-duplicates' },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`UPSERT ${table} failed (${res.status}): ${err}`)
  }
  return res.json()
}

/**
 * Create a user via Supabase Auth Admin API.
 * This creates the auth.users record; a DB trigger should create the public.users row.
 */
async function createAuthUser(email, password = 'TestPass123!') {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
    }),
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Auth create user failed (${res.status}): ${err}`)
  }
  const data = await res.json()
  return data.id
}

// Test cleaner profiles to seed
const testCleaners = [
  // === POOL CLEANING (Orlando, Tampa) ===
  {
    user: {
      email: 'test-pool-orlando@bossofclean.com',
      full_name: 'Crystal Clear Pool Co.',
      phone: '407-555-0101',
      role: 'cleaner',
      city: 'Orlando',
      state: 'FL',
      zip_code: '32801',
    },
    cleaner: {
      business_name: 'Crystal Clear Pool Co.',
      business_description: 'Professional pool cleaning and maintenance for residential and commercial properties in the Orlando metro. Weekly service, one-time cleanups, and green-to-clean transformations.',
      business_phone: '407-555-0101',
      business_email: 'test-pool-orlando@bossofclean.com',
      services: ['pool_cleaning'],
      hourly_rate: 85,
      years_experience: 8,
      employees_count: 3,
      approval_status: 'approved',
      subscription_tier: 'basic',
      average_rating: 4.8,
      total_reviews: 47,
      total_jobs: 312,
      business_slug: 'crystal-clear-pool-orlando',
    },
    serviceAreas: [
      { zip_code: '32801', city: 'Orlando', county: 'Orange' },
      { zip_code: '32803', city: 'Orlando', county: 'Orange' },
      { zip_code: '32806', city: 'Orlando', county: 'Orange' },
      { zip_code: '32819', city: 'Orlando', county: 'Orange' },
      { zip_code: '34786', city: 'Windermere', county: 'Orange' },
    ],
  },
  {
    user: {
      email: 'test-pool-tampa@bossofclean.com',
      full_name: 'Tampa Bay Pool Pros',
      phone: '813-555-0102',
      role: 'cleaner',
      city: 'Tampa',
      state: 'FL',
      zip_code: '33602',
    },
    cleaner: {
      business_name: 'Tampa Bay Pool Pros',
      business_description: 'Licensed & insured pool cleaning serving Tampa Bay. Chemical balancing, filter maintenance, equipment repair, and weekly service plans.',
      business_phone: '813-555-0102',
      business_email: 'test-pool-tampa@bossofclean.com',
      services: ['pool_cleaning'],
      hourly_rate: 90,
      years_experience: 12,
      employees_count: 5,
      approval_status: 'approved',
      subscription_tier: 'pro',
      average_rating: 4.9,
      total_reviews: 89,
      total_jobs: 620,
      business_slug: 'tampa-bay-pool-pros',
    },
    serviceAreas: [
      { zip_code: '33602', city: 'Tampa', county: 'Hillsborough' },
      { zip_code: '33606', city: 'Tampa', county: 'Hillsborough' },
      { zip_code: '33609', city: 'Tampa', county: 'Hillsborough' },
      { zip_code: '33629', city: 'Tampa', county: 'Hillsborough' },
      { zip_code: '33611', city: 'Tampa', county: 'Hillsborough' },
    ],
  },

  // === LANDSCAPING (Miami, Jacksonville) ===
  {
    user: {
      email: 'test-landscape-miami@bossofclean.com',
      full_name: 'Tropical Green Landscaping',
      phone: '305-555-0201',
      role: 'cleaner',
      city: 'Miami',
      state: 'FL',
      zip_code: '33130',
    },
    cleaner: {
      business_name: 'Tropical Green Landscaping',
      business_description: 'Full-service landscaping for South Florida homes and businesses. Lawn care, hedge trimming, palm tree maintenance, irrigation repair, and landscape design.',
      business_phone: '305-555-0201',
      business_email: 'test-landscape-miami@bossofclean.com',
      services: ['landscaping'],
      hourly_rate: 65,
      years_experience: 15,
      employees_count: 8,
      approval_status: 'approved',
      subscription_tier: 'pro',
      average_rating: 4.7,
      total_reviews: 63,
      total_jobs: 485,
      business_slug: 'tropical-green-landscaping-miami',
    },
    serviceAreas: [
      { zip_code: '33130', city: 'Miami', county: 'Miami-Dade' },
      { zip_code: '33131', city: 'Miami', county: 'Miami-Dade' },
      { zip_code: '33133', city: 'Miami', county: 'Miami-Dade' },
      { zip_code: '33139', city: 'Miami Beach', county: 'Miami-Dade' },
      { zip_code: '33140', city: 'Miami Beach', county: 'Miami-Dade' },
    ],
  },
  {
    user: {
      email: 'test-landscape-jax@bossofclean.com',
      full_name: 'First Coast Lawn & Garden',
      phone: '904-555-0202',
      role: 'cleaner',
      city: 'Jacksonville',
      state: 'FL',
      zip_code: '32202',
    },
    cleaner: {
      business_name: 'First Coast Lawn & Garden',
      business_description: 'Jacksonville\'s trusted landscaping team. Mowing, edging, mulching, tree trimming, sod installation, and seasonal cleanups for residential and commercial.',
      business_phone: '904-555-0202',
      business_email: 'test-landscape-jax@bossofclean.com',
      services: ['landscaping'],
      hourly_rate: 55,
      years_experience: 10,
      employees_count: 6,
      approval_status: 'approved',
      subscription_tier: 'basic',
      average_rating: 4.6,
      total_reviews: 34,
      total_jobs: 267,
      business_slug: 'first-coast-lawn-garden-jax',
    },
    serviceAreas: [
      { zip_code: '32202', city: 'Jacksonville', county: 'Duval' },
      { zip_code: '32204', city: 'Jacksonville', county: 'Duval' },
      { zip_code: '32205', city: 'Jacksonville', county: 'Duval' },
      { zip_code: '32207', city: 'Jacksonville', county: 'Duval' },
      { zip_code: '32210', city: 'Jacksonville', county: 'Duval' },
    ],
  },

  // === CAR DETAILING (Statewide) ===
  {
    user: {
      email: 'test-detail-statewide@bossofclean.com',
      full_name: 'Sunshine State Mobile Detailing',
      phone: '321-555-0301',
      role: 'cleaner',
      city: 'Orlando',
      state: 'FL',
      zip_code: '32801',
    },
    cleaner: {
      business_name: 'Sunshine State Mobile Detailing',
      business_description: 'Mobile car detailing that comes to you anywhere in Florida. Interior/exterior detail, ceramic coating, paint correction, and fleet services.',
      business_phone: '321-555-0301',
      business_email: 'test-detail-statewide@bossofclean.com',
      services: ['mobile_car_detailing'],
      hourly_rate: 75,
      years_experience: 6,
      employees_count: 4,
      approval_status: 'approved',
      subscription_tier: 'pro',
      average_rating: 4.9,
      total_reviews: 112,
      total_jobs: 843,
      business_slug: 'sunshine-state-mobile-detailing',
    },
    serviceAreas: [
      // Major metros statewide
      { zip_code: '32801', city: 'Orlando', county: 'Orange' },
      { zip_code: '33602', city: 'Tampa', county: 'Hillsborough' },
      { zip_code: '33130', city: 'Miami', county: 'Miami-Dade' },
      { zip_code: '32202', city: 'Jacksonville', county: 'Duval' },
      { zip_code: '33401', city: 'West Palm Beach', county: 'Palm Beach' },
      { zip_code: '32301', city: 'Tallahassee', county: 'Leon' },
      { zip_code: '33301', city: 'Fort Lauderdale', county: 'Broward' },
    ],
  },
  {
    user: {
      email: 'test-detail-sofla@bossofclean.com',
      full_name: 'Pristine Auto Spa',
      phone: '954-555-0302',
      role: 'cleaner',
      city: 'Fort Lauderdale',
      state: 'FL',
      zip_code: '33301',
    },
    cleaner: {
      business_name: 'Pristine Auto Spa',
      business_description: 'Premium mobile car detailing in South Florida. Specializing in luxury vehicles, ceramic coatings, and paint protection film. We come to your home or office.',
      business_phone: '954-555-0302',
      business_email: 'test-detail-sofla@bossofclean.com',
      services: ['mobile_car_detailing'],
      hourly_rate: 95,
      years_experience: 9,
      employees_count: 3,
      approval_status: 'approved',
      subscription_tier: 'basic',
      average_rating: 4.8,
      total_reviews: 56,
      total_jobs: 398,
      business_slug: 'pristine-auto-spa-sofla',
    },
    serviceAreas: [
      { zip_code: '33301', city: 'Fort Lauderdale', county: 'Broward' },
      { zip_code: '33304', city: 'Fort Lauderdale', county: 'Broward' },
      { zip_code: '33130', city: 'Miami', county: 'Miami-Dade' },
      { zip_code: '33139', city: 'Miami Beach', county: 'Miami-Dade' },
      { zip_code: '33401', city: 'West Palm Beach', county: 'Palm Beach' },
    ],
  },

  // === AIR DUCT CLEANING (Major Metros) ===
  {
    user: {
      email: 'test-duct-orlando@bossofclean.com',
      full_name: 'FreshAir Duct Solutions',
      phone: '407-555-0401',
      role: 'cleaner',
      city: 'Orlando',
      state: 'FL',
      zip_code: '32801',
    },
    cleaner: {
      business_name: 'FreshAir Duct Solutions',
      business_description: 'Professional air duct cleaning and HVAC maintenance for Central Florida. Improve air quality, reduce allergens, and boost AC efficiency.',
      business_phone: '407-555-0401',
      business_email: 'test-duct-orlando@bossofclean.com',
      services: ['air_duct_cleaning'],
      hourly_rate: 120,
      years_experience: 11,
      employees_count: 4,
      approval_status: 'approved',
      subscription_tier: 'basic',
      average_rating: 4.7,
      total_reviews: 28,
      total_jobs: 189,
      business_slug: 'freshair-duct-solutions-orlando',
    },
    serviceAreas: [
      { zip_code: '32801', city: 'Orlando', county: 'Orange' },
      { zip_code: '32803', city: 'Orlando', county: 'Orange' },
      { zip_code: '32819', city: 'Orlando', county: 'Orange' },
      { zip_code: '34747', city: 'Kissimmee', county: 'Osceola' },
    ],
  },
  {
    user: {
      email: 'test-duct-miami@bossofclean.com',
      full_name: 'South Florida Duct Masters',
      phone: '305-555-0402',
      role: 'cleaner',
      city: 'Miami',
      state: 'FL',
      zip_code: '33130',
    },
    cleaner: {
      business_name: 'South Florida Duct Masters',
      business_description: 'Expert air duct cleaning, dryer vent cleaning, and indoor air quality solutions. Serving Miami-Dade, Broward, and Palm Beach counties.',
      business_phone: '305-555-0402',
      business_email: 'test-duct-miami@bossofclean.com',
      services: ['air_duct_cleaning'],
      hourly_rate: 130,
      years_experience: 14,
      employees_count: 6,
      approval_status: 'approved',
      subscription_tier: 'pro',
      average_rating: 4.9,
      total_reviews: 71,
      total_jobs: 534,
      business_slug: 'south-florida-duct-masters',
    },
    serviceAreas: [
      { zip_code: '33130', city: 'Miami', county: 'Miami-Dade' },
      { zip_code: '33131', city: 'Miami', county: 'Miami-Dade' },
      { zip_code: '33301', city: 'Fort Lauderdale', county: 'Broward' },
      { zip_code: '33401', city: 'West Palm Beach', county: 'Palm Beach' },
    ],
  },
  {
    user: {
      email: 'test-duct-tampa@bossofclean.com',
      full_name: 'BreezeClean Tampa',
      phone: '813-555-0403',
      role: 'cleaner',
      city: 'Tampa',
      state: 'FL',
      zip_code: '33602',
    },
    cleaner: {
      business_name: 'BreezeClean Tampa',
      business_description: 'Tampa Bay area air duct and dryer vent cleaning. NADCA certified. Residential and commercial. Free inspections and quotes.',
      business_phone: '813-555-0403',
      business_email: 'test-duct-tampa@bossofclean.com',
      services: ['air_duct_cleaning'],
      hourly_rate: 110,
      years_experience: 7,
      employees_count: 3,
      approval_status: 'approved',
      subscription_tier: 'free',
      average_rating: 4.5,
      total_reviews: 15,
      total_jobs: 98,
      business_slug: 'breezeclean-tampa',
    },
    serviceAreas: [
      { zip_code: '33602', city: 'Tampa', county: 'Hillsborough' },
      { zip_code: '33606', city: 'Tampa', county: 'Hillsborough' },
      { zip_code: '33609', city: 'Tampa', county: 'Hillsborough' },
      { zip_code: '33701', city: 'St. Petersburg', county: 'Pinellas' },
    ],
  },
]

async function seed() {
  console.log('Seeding test cleaner profiles for new service verticals...\n')

  let created = 0
  let skipped = 0

  for (const profile of testCleaners) {
    const { user, cleaner, serviceAreas } = profile

    try {
      // Check if cleaner already exists by slug
      const existsRes = await fetch(
        `${SUPABASE_URL}/rest/v1/cleaners?business_slug=eq.${encodeURIComponent(cleaner.business_slug)}&select=id`,
        { headers }
      )
      const existing = await existsRes.json()

      if (existing.length > 0) {
        console.log(`  SKIP: ${cleaner.business_name} (${cleaner.business_slug}) - already exists`)
        skipped++
        continue
      }

      // Create auth user first (this creates auth.users row)
      const userId = await createAuthUser(user.email)
      console.log(`  + Auth user created: ${user.email} (${userId})`)

      // Wait briefly for trigger to fire
      await new Promise(r => setTimeout(r, 500))

      // Upsert public.users record with profile data
      await supabaseUpsert('users', {
        id: userId,
        ...user,
      })
      console.log(`  + User profile: ${user.full_name}`)

      // Create cleaner profile
      const cleanerId = randomUUID()
      const [cleanerResult] = await supabasePost('cleaners', {
        id: cleanerId,
        user_id: userId,
        ...cleaner,
        service_areas: serviceAreas.map(sa => sa.zip_code),
      })
      console.log(`    + Cleaner: ${cleaner.business_name} [${cleaner.services.join(', ')}]`)

      // Create service area entries
      const areaEntries = serviceAreas.map(sa => ({
        id: randomUUID(),
        cleaner_id: cleanerId,
        ...sa,
      }))
      await supabasePost('service_areas', areaEntries)
      console.log(`    + Service areas: ${serviceAreas.length} zip codes`)

      created++
    } catch (err) {
      console.error(`  ERROR: ${cleaner.business_name}: ${err.message}`)
    }
  }

  console.log(`\nDone! Created: ${created}, Skipped: ${skipped}, Total: ${testCleaners.length}`)
}

seed().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
