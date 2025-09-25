/**
 * Seed Test Users Script for Boss of Clean QA Testing
 *
 * This script creates and manages test users for automated testing of the
 * booking history feature and other QA validation scenarios.
 *
 * Usage:
 * npm run seed:test-users
 * or
 * npx tsx scripts/seed-test-users.ts
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables
config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables: NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Create Supabase admin client
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

interface TestUser {
  email: string;
  password: string;
  full_name: string;
  role: 'customer' | 'cleaner' | 'admin';
  tier?: 'free' | 'growth' | 'pro';
  metadata?: Record<string, any>;
}

const TEST_USERS: TestUser[] = [
  {
    email: 'free.user@test.com',
    password: 'Test1234!',
    full_name: 'Free Tier User',
    role: 'customer',
    tier: 'free',
    metadata: { subscription_tier: 'free', test_user: true }
  },
  {
    email: 'growth.user@test.com',
    password: 'Test1234!',
    full_name: 'Growth Tier User',
    role: 'customer',
    tier: 'growth',
    metadata: { subscription_tier: 'growth', test_user: true }
  },
  {
    email: 'pro.user@test.com',
    password: 'Test1234!',
    full_name: 'Pro Tier User',
    role: 'customer',
    tier: 'pro',
    metadata: { subscription_tier: 'pro', test_user: true }
  },
  {
    email: 'cleaner.user@test.com',
    password: 'Test1234!',
    full_name: 'Test Cleaner User',
    role: 'cleaner',
    metadata: { test_user: true, business_name: 'Test Cleaning Service' }
  }
];

/**
 * Create or update a test user
 */
async function createTestUser(user: TestUser): Promise<void> {
  console.log(`Creating/updating test user: ${user.email}`);

  try {
    // Check if user already exists
    const { data: existingUser, error: getUserError } = await supabase.auth.admin.getUserByEmail(user.email);

    if (existingUser && !getUserError) {
      console.log(`  User ${user.email} already exists, updating password...`);

      // Update existing user password
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        existingUser.id,
        {
          password: user.password,
          user_metadata: user.metadata
        }
      );

      if (updateError) {
        console.error(`  Failed to update user ${user.email}:`, updateError.message);
        return;
      }

      // Update user profile
      const { error: profileError } = await supabase
        .from('users')
        .update({
          full_name: user.full_name,
          role: user.role,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingUser.id);

      if (profileError) {
        console.error(`  Failed to update profile for ${user.email}:`, profileError.message);
        return;
      }

    } else {
      // Create new user
      console.log(`  Creating new user: ${user.email}`);

      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true,
        user_metadata: user.metadata
      });

      if (createError || !newUser.user) {
        console.error(`  Failed to create user ${user.email}:`, createError?.message);
        return;
      }

      // Create user profile
      const { error: profileError } = await supabase
        .from('users')
        .insert({
          id: newUser.user.id,
          email: user.email,
          full_name: user.full_name,
          role: user.role,
          city: 'Miami',
          state: 'FL',
          zip_code: '33101'
        });

      if (profileError) {
        console.error(`  Failed to create profile for ${user.email}:`, profileError.message);
        return;
      }
    }

    // Create cleaner profile if role is cleaner
    if (user.role === 'cleaner') {
      await createCleanerProfile(user);
    }

    console.log(`  ✓ Successfully processed user: ${user.email}`);

  } catch (error) {
    console.error(`  Error processing user ${user.email}:`, error);
  }
}

/**
 * Create cleaner profile for cleaner users
 */
async function createCleanerProfile(user: TestUser): Promise<void> {
  try {
    // Get user ID
    const { data: authUser } = await supabase.auth.admin.getUserByEmail(user.email);
    if (!authUser) return;

    // Check if cleaner profile exists
    const { data: existingCleaner } = await supabase
      .from('cleaners')
      .select('id')
      .eq('user_id', authUser.id)
      .single();

    if (existingCleaner) {
      // Update existing cleaner profile
      const { error } = await supabase
        .from('cleaners')
        .update({
          business_name: user.metadata?.business_name || 'Test Cleaning Service',
          business_description: 'Professional test cleaning service for QA testing',
          hourly_rate: 75.00,
          subscription_tier: 'pro',
          approval_status: 'approved',
          approved_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('user_id', authUser.id);

      if (error) {
        console.error(`    Failed to update cleaner profile:`, error.message);
      }
    } else {
      // Create new cleaner profile
      const { error } = await supabase
        .from('cleaners')
        .insert({
          user_id: authUser.id,
          business_name: user.metadata?.business_name || 'Test Cleaning Service',
          business_description: 'Professional test cleaning service for QA testing',
          hourly_rate: 75.00,
          subscription_tier: 'pro',
          approval_status: 'approved',
          approved_at: new Date().toISOString()
        });

      if (error) {
        console.error(`    Failed to create cleaner profile:`, error.message);
      }
    }

    console.log(`    ✓ Cleaner profile processed for: ${user.email}`);
  } catch (error) {
    console.error(`    Error creating cleaner profile:`, error);
  }
}

/**
 * Create sample booking history for test users
 */
async function createSampleBookings(): Promise<void> {
  console.log('\nCreating sample booking history for test users...');

  try {
    // Get test customer and cleaner IDs
    const { data: customers } = await supabase
      .from('users')
      .select('id, email')
      .in('email', ['free.user@test.com', 'growth.user@test.com', 'pro.user@test.com']);

    const { data: cleaners } = await supabase
      .from('cleaners')
      .select('id, user_id')
      .limit(1);

    if (!customers?.length || !cleaners?.length) {
      console.log('  No customers or cleaners found, skipping sample bookings');
      return;
    }

    const cleaner = cleaners[0];
    const sampleBookings = [];

    for (const customer of customers) {
      // Create 3-5 sample bookings per customer
      const bookingCount = Math.floor(Math.random() * 3) + 3;

      for (let i = 0; i < bookingCount; i++) {
        const bookingDate = new Date();
        bookingDate.setDate(bookingDate.getDate() - Math.floor(Math.random() * 90)); // Random date in last 90 days

        const statuses = ['completed', 'scheduled', 'in_progress', 'cancelled'];
        const serviceTypes = ['house-cleaning', 'deep-cleaning', 'move-out-cleaning', 'office-cleaning'];

        sampleBookings.push({
          customer_id: customer.id,
          cleaner_id: cleaner.id,
          service_type: serviceTypes[Math.floor(Math.random() * serviceTypes.length)],
          service_date: bookingDate.toISOString().split('T')[0],
          service_time: '10:00:00',
          duration_hours: Math.floor(Math.random() * 4) + 2,
          address: `${Math.floor(Math.random() * 9999)} Test St`,
          city: 'Miami',
          zip_code: '33101',
          status: statuses[Math.floor(Math.random() * statuses.length)],
          total_amount: (Math.random() * 200 + 100).toFixed(2),
          payment_status: 'paid',
          description: `Test booking for ${customer.email}`,
          created_at: bookingDate.toISOString()
        });
      }
    }

    // Insert sample bookings
    const { error } = await supabase
      .from('booking_history')
      .insert(sampleBookings);

    if (error) {
      console.error('  Failed to create sample bookings:', error.message);
    } else {
      console.log(`  ✓ Created ${sampleBookings.length} sample bookings`);
    }

  } catch (error) {
    console.error('  Error creating sample bookings:', error);
  }
}

/**
 * Verify database performance with the new index
 */
async function verifyPerformance(): Promise<void> {
  console.log('\nVerifying database performance...');

  try {
    const startTime = Date.now();

    // Test query that should benefit from the new index
    const { data, error } = await supabase
      .from('booking_history')
      .select('*')
      .eq('customer_id', 'b8e01833-4947-4932-8e16-798ae42c8e0a')
      .order('created_at', { ascending: false })
      .limit(20);

    const queryTime = Date.now() - startTime;

    if (error) {
      console.error('  Performance test query failed:', error.message);
    } else {
      console.log(`  ✓ Query executed in ${queryTime}ms (target: <200ms)`);
      console.log(`  ✓ Retrieved ${data.length} booking records`);

      if (queryTime > 200) {
        console.warn('  ⚠️  Query time exceeds target of 200ms');
      }
    }

  } catch (error) {
    console.error('  Error during performance verification:', error);
  }
}

/**
 * Main execution function
 */
async function main(): Promise<void> {
  console.log('🧹 Boss of Clean - Test User Seeding Script');
  console.log('===========================================\n');

  try {
    // Create test users
    console.log('Creating test users...');
    for (const user of TEST_USERS) {
      await createTestUser(user);
    }

    // Create sample booking data
    await createSampleBookings();

    // Verify performance
    await verifyPerformance();

    console.log('\n✅ Test user seeding completed successfully!');
    console.log('\nTest Users Created:');
    TEST_USERS.forEach(user => {
      console.log(`  - ${user.email} (${user.role}${user.tier ? `, ${user.tier} tier` : ''})`);
    });

    console.log('\n📝 Credentials:');
    console.log('  Password for all test users: Test1234!');
    console.log('  See .env.test file for complete credentials');

  } catch (error) {
    console.error('❌ Script execution failed:', error);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Unhandled error:', error);
    process.exit(1);
  });
}

export { createTestUser, createSampleBookings, verifyPerformance };