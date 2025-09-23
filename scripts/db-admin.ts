import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../.env.local') })

// Create admin client with service role key
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

// Database utility functions
export async function listTables() {
  const { data, error } = await supabaseAdmin
    .from('information_schema.tables')
    .select('table_name, table_schema')
    .eq('table_schema', 'public')
  
  if (error) {
    console.error('Error listing tables:', error)
    return null
  }
  
  return data
}

export async function executeQuery(query: string) {
  const { data, error } = await supabaseAdmin.rpc('execute_sql', { query })
  
  if (error) {
    console.error('Error executing query:', error)
    return null
  }
  
  return data
}

export async function getTableData(tableName: string, limit = 10) {
  const { data, error } = await supabaseAdmin
    .from(tableName)
    .select('*')
    .limit(limit)
  
  if (error) {
    console.error(`Error fetching data from ${tableName}:`, error)
    return null
  }
  
  return data
}

// Test connection and list tables
async function testConnection() {
  console.log('Testing Supabase connection...')
  console.log('URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
  
  // Try to list all tables
  const { data: tables, error: tableError } = await supabaseAdmin
    .rpc('', {}, {
      head: false,
      count: null
    })
    .maybeSingle()
  
  // Alternative: try to fetch from a known table
  const { data, error } = await supabaseAdmin
    .from('reviews')
    .select('*')
    .limit(1)
  
  if (error && !data) {
    // Try another common table
    const { data: quoteData, error: quoteError } = await supabaseAdmin
      .from('quote_requests')
      .select('*')
      .limit(1)
    
    if (quoteError) {
      console.error('Connection test failed:', quoteError)
      console.log('\nTrying to list available tables...')
      
      // List tables using raw SQL
      const { data: tablesData, error: tablesError } = await supabaseAdmin
        .from('information_schema.tables' as any)
        .select('table_name')
        .eq('table_schema', 'public')
      
      if (!tablesError && tablesData) {
        console.log('Available tables:', tablesData.map((t: any) => t.table_name))
      }
    } else {
      console.log('✅ Successfully connected to Supabase!')
      console.log('Found quote_requests table with data:', quoteData)
    }
  } else {
    console.log('✅ Successfully connected to Supabase!')
    console.log('Found reviews table with data:', data)
  }
}

// Run if called directly
if (require.main === module) {
  testConnection()
}

export { supabaseAdmin }