-- =====================================================
-- AUTHENTICATION SETUP
-- =====================================================
-- This script sets up authentication triggers and functions

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, full_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
        COALESCE(NEW.raw_user_meta_data->>'role', 'customer')::user_role
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create user profile on signup
CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to handle user deletion
CREATE OR REPLACE FUNCTION public.handle_user_delete()
RETURNS TRIGGER AS $$
BEGIN
    -- User profile will be deleted automatically due to CASCADE
    -- But we can add any cleanup logic here if needed
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- EMAIL TEMPLATES SETUP (Run in Supabase Dashboard)
-- =====================================================
-- Note: These templates should be configured in your Supabase dashboard
-- under Authentication > Email Templates

/*
1. Confirmation Email Template:
   Subject: Welcome to Boss of Clean! Please confirm your email
   Body:
   <h2>Welcome to Boss of Clean!</h2>
   <p>Thanks for signing up. Please confirm your email address by clicking the link below:</p>
   <p><a href="{{ .ConfirmationURL }}">Confirm your email</a></p>
   <p>If you didn't sign up for Boss of Clean, you can safely ignore this email.</p>

2. Password Reset Template:
   Subject: Reset your Boss of Clean password
   Body:
   <h2>Reset Your Password</h2>
   <p>We received a request to reset your password. Click the link below to create a new password:</p>
   <p><a href="{{ .ConfirmationURL }}">Reset Password</a></p>
   <p>This link will expire in 24 hours.</p>
   <p>If you didn't request this, you can safely ignore this email.</p>

3. Magic Link Template:
   Subject: Your Boss of Clean login link
   Body:
   <h2>Login to Boss of Clean</h2>
   <p>Click the link below to log in to your account:</p>
   <p><a href="{{ .ConfirmationURL }}">Log in to Boss of Clean</a></p>
   <p>This link will expire in 24 hours.</p>
*/

-- =====================================================
-- AUTHENTICATION SETTINGS (Configure in Dashboard)
-- =====================================================
/*
In Supabase Dashboard > Authentication > Settings:

1. Enable Email Provider:
   - Enable "Email" 
   - Enable "Confirm email" (recommended for production)
   - Set "Email confirmation URI" to: https://bossofclean2.netlify.app/auth/confirm

2. Configure SMTP (for production):
   - Add your SMTP settings for sending emails
   - Or use Supabase's built-in email service (limited)

3. URL Configuration:
   - Site URL: https://bossofclean2.netlify.app
   - Redirect URLs: 
     - https://bossofclean2.netlify.app/*
     - http://localhost:3000/* (for development)

4. Security Settings:
   - Enable "Secure email change"
   - Enable "Secure password change"
   - Set minimum password length to 8
*/

-- =====================================================
-- SEED DATA FOR TESTING
-- =====================================================

-- Create admin user (run this after creating your first user)
-- UPDATE public.users SET role = 'admin' WHERE email = 'your-admin-email@example.com';

-- Create sample cleaner profiles for testing
INSERT INTO public.cleaners (
    user_id,
    business_name,
    business_description,
    business_phone,
    business_email,
    services,
    service_areas,
    hourly_rate,
    minimum_hours,
    years_experience,
    insurance_verified,
    license_verified,
    approval_status,
    average_rating,
    total_reviews
) VALUES 
(
    (SELECT id FROM public.users WHERE email = 'demo@example.com' LIMIT 1),
    'Sparkle Clean Pro',
    'Professional cleaning services in Miami area. We make your home shine!',
    '305-555-0100',
    'info@sparklecleanpro.com',
    ARRAY['residential', 'deep_cleaning', 'move_in_out'],
    ARRAY['33109', '33139', '33140', '33141'],
    65.00,
    3,
    8,
    true,
    true,
    'approved',
    4.8,
    127
),
(
    (SELECT id FROM public.users WHERE email = 'demo2@example.com' LIMIT 1),
    'Green Clean Solutions',
    'Eco-friendly cleaning services using only natural products.',
    '407-555-0200',
    'hello@greencleansolutions.com',
    ARRAY['residential', 'commercial', 'window_cleaning'],
    ARRAY['32801', '32803', '32804', '32806'],
    55.00,
    2,
    5,
    true,
    false,
    'approved',
    4.6,
    89
)
ON CONFLICT DO NOTHING;

-- =====================================================
-- USEFUL QUERIES FOR ADMIN
-- =====================================================

-- View all users and their roles
-- SELECT id, email, full_name, role, created_at FROM public.users ORDER BY created_at DESC;

-- View all cleaners and their subscription status
-- SELECT c.business_name, c.subscription_tier, c.approval_status, u.email 
-- FROM public.cleaners c 
-- JOIN public.users u ON c.user_id = u.id 
-- ORDER BY c.created_at DESC;

-- View recent quote requests
-- SELECT q.*, u1.full_name as customer_name, c.business_name as cleaner_name
-- FROM public.quote_requests q
-- JOIN public.users u1 ON q.customer_id = u1.id
-- JOIN public.cleaners c ON q.cleaner_id = c.id
-- ORDER BY q.created_at DESC
-- LIMIT 20;