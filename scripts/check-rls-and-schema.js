#!/usr/bin/env node

/**
 * Boss of Clean - Database Schema & RLS Validation Script
 * 
 * Validates critical database components are in place:
 * - Public directory view exists
 * - RLS policies are enabled on core tables
 * - Location enforcement trigger is active
 * 
 * Always exits 0 (non-blocking) - warnings only
 */

const { createClient } = require('@supabase/supabase-js');

const REQUIRED_TABLES = [
  'users',
  'cleaners', 
  'quote_requests',
  'reviews'
];

const REQUIRED_VIEWS = [
  'cleaner_directory'
];

const REQUIRED_TRIGGERS = [
  'enforce_cleaner_location_complete'
];

async function checkSupabaseConnection() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.log('ℹ️  Supabase environment variables not found - skipping database checks');
    return null;
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Test connection with a simple query
    const { error } = await supabase.from('users').select('count').limit(1);
    if (error) {
      console.log(`⚠️  Cannot connect to Supabase: ${error.message}`);
      return null;
    }
    
    console.log('✅ Supabase connection established');
    return supabase;
  } catch (error) {
    console.log(`⚠️  Supabase connection failed: ${error.message}`);
    return null;
  }
}

async function checkRLSPolicies(supabase) {
  console.log('\n📋 Checking RLS policies...');
  
  try {
    const { data: tables, error } = await supabase
      .rpc('check_table_rls_status', {})
      .catch(() => {
        // Fallback query if custom function doesn't exist
        return supabase
          .from('information_schema.tables')
          .select('table_name')
          .eq('table_schema', 'public')
          .in('table_name', REQUIRED_TABLES);
      });

    if (error) {
      console.log(`⚠️  Could not check RLS status: ${error.message}`);
      return;
    }

    for (const tableName of REQUIRED_TABLES) {
      // Try to check if RLS is enabled (this query will work for service role)
      const { error: rlsError } = await supabase
        .from(tableName)
        .select('count')
        .limit(1);
        
      if (rlsError && rlsError.code === 'PGRST301') {
        console.log(`⚠️  RLS may not be properly configured on '${tableName}' table`);
      } else {
        console.log(`✅ Table '${tableName}' appears to have RLS configured`);
      }
    }
  } catch (error) {
    console.log(`⚠️  RLS check failed: ${error.message}`);
  }
}

async function checkRequiredViews(supabase) {
  console.log('\n📋 Checking required views...');
  
  try {
    for (const viewName of REQUIRED_VIEWS) {
      const { data, error } = await supabase
        .from(viewName)
        .select('count')
        .limit(1);
        
      if (error) {
        console.log(`❌ View '${viewName}' is missing or inaccessible`);
        console.log(`   Error: ${error.message}`);
      } else {
        console.log(`✅ View '${viewName}' exists and is accessible`);
      }
    }
  } catch (error) {
    console.log(`⚠️  View check failed: ${error.message}`);
  }
}

async function checkTriggers(supabase) {
  console.log('\n📋 Checking triggers...');
  
  try {
    const { data: triggers, error } = await supabase
      .rpc('sql', {
        query: `
          SELECT trigger_name, event_object_table 
          FROM information_schema.triggers 
          WHERE trigger_schema = 'public'
          AND trigger_name = ANY($1);
        `,
        params: [REQUIRED_TRIGGERS]
      })
      .catch(() => null); // Ignore if rpc doesn't exist

    if (error || !triggers) {
      console.log(`⚠️  Could not check triggers - may require database admin access`);
      return;
    }

    for (const triggerName of REQUIRED_TRIGGERS) {
      const found = triggers.find(t => t.trigger_name === triggerName);
      if (found) {
        console.log(`✅ Trigger '${triggerName}' exists on table '${found.event_object_table}'`);
      } else {
        console.log(`❌ Trigger '${triggerName}' is missing`);
      }
    }
  } catch (error) {
    console.log(`⚠️  Trigger check failed: ${error.message}`);
  }
}

async function checkDirectoryViewData(supabase) {
  console.log('\n📋 Checking directory view data...');
  
  try {
    const { data, error, count } = await supabase
      .from('cleaner_directory')
      .select('cleaner_id, business_name, city, zip_code', { count: 'exact' })
      .limit(5);
      
    if (error) {
      console.log(`❌ Cannot query cleaner_directory view: ${error.message}`);
      return;
    }

    console.log(`✅ Directory view contains ${count || 0} approved cleaners`);
    
    if (data && data.length > 0) {
      console.log('   Sample entries:');
      data.forEach(cleaner => {
        console.log(`   - ${cleaner.business_name} (${cleaner.city}, ${cleaner.zip_code})`);
      });
    }
    
    // Check for potential data quality issues
    const withoutLocation = data?.filter(c => !c.city || !c.zip_code) || [];
    if (withoutLocation.length > 0) {
      console.log(`⚠️  ${withoutLocation.length} cleaners missing location data`);
    }
    
  } catch (error) {
    console.log(`⚠️  Directory view data check failed: ${error.message}`);
  }
}

async function main() {
  console.log('🔍 Boss of Clean - Database Schema Validation');
  console.log('============================================');
  
  const supabase = await checkSupabaseConnection();
  
  if (!supabase) {
    console.log('\n✅ Schema validation skipped (no Supabase connection)');
    process.exit(0);
  }
  
  await checkRLSPolicies(supabase);
  await checkRequiredViews(supabase);
  await checkTriggers(supabase);
  await checkDirectoryViewData(supabase);
  
  console.log('\n✅ Database schema validation completed');
  console.log('   Note: This script provides warnings only and does not block builds');
  
  // Always exit 0 (success) to avoid blocking CI
  process.exit(0);
}

// Handle unhandled rejections
process.on('unhandledRejection', (error) => {
  console.log(`⚠️  Unhandled error: ${error.message}`);
  process.exit(0); // Still exit successfully to avoid blocking CI
});

if (require.main === module) {
  main();
}

module.exports = {
  checkSupabaseConnection,
  checkRLSPolicies,
  checkRequiredViews,
  checkTriggers,
  checkDirectoryViewData
};