const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('Supabase URL:', supabaseUrl);
console.log('Has service key:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);

const supabase = createClient(supabaseUrl, supabaseKey);

async function createTestUsers() {
  const testUsers = [
    {
      email: 'qa.test1@bosofclean.com',
      password: 'QATest123!',
    },
    {
      email: 'qa.test2@bosofclean.com',
      password: 'QATest123!',
    }
  ];

  for (const user of testUsers) {
    console.log(`Creating user: ${user.email}`);

    try {
      const { data, error } = await supabase.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true,
        user_metadata: {
          full_name: user.email === 'qa.test1@bosofclean.com' ? 'QA Test User 1' : 'QA Test User 2'
        }
      });

      if (error) {
        console.error(`Error creating ${user.email}:`, error.message);
      } else {
        console.log(`Successfully created ${user.email}:`, data.user.id);

        // Also insert into public.users table for complete setup
        const { error: insertError } = await supabase
          .from('users')
          .insert({
            id: data.user.id,
            email: user.email,
            full_name: user.email === 'qa.test1@bosofclean.com' ? 'QA Test User 1' : 'QA Test User 2',
            role: 'customer',
            email_verified: true
          });

        if (insertError) {
          console.log(`Note: User profile insert failed (may already exist):`, insertError.message);
        } else {
          console.log(`User profile created successfully`);
        }
      }
    } catch (err) {
      console.error(`Exception creating ${user.email}:`, err.message);
    }
  }
}

createTestUsers().catch(console.error);