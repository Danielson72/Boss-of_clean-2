# 🗄️ Supabase Database Setup Guide

## 📋 **Complete Setup Instructions**

Follow these steps **in order** to set up your Boss of Clean database:

### **Step 1: Run SQL Scripts in Supabase**

1. **Go to Supabase Dashboard**: https://supabase.com/dashboard
2. **Select your project**: Boss of Clean project
3. **Open SQL Editor**: Left sidebar > SQL Editor
4. **Run each script in order**:

#### **Script 1: Create Tables**
```sql
-- Copy and paste content from: supabase/01-create-tables.sql
-- This creates all tables, indexes, and functions
```

#### **Script 2: Row Level Security**
```sql  
-- Copy and paste content from: supabase/02-row-level-security.sql
-- This sets up secure access control
```

#### **Script 3: Authentication Setup**
```sql
-- Copy and paste content from: supabase/03-auth-setup.sql  
-- This configures user registration and auth triggers
```

#### **Script 4: Sample Data**
```sql
-- Copy and paste content from: supabase/04-sample-data.sql
-- This adds Florida ZIP codes and sample data
```

### **Step 2: Configure Authentication**

1. **Go to**: Authentication > Settings in Supabase Dashboard

2. **Enable Email Provider**:
   - ✅ Enable "Email" 
   - ✅ Enable "Confirm email"
   - Set **Email confirmation URI**: `https://bossofclean2.netlify.app/auth/confirm`

3. **Configure URLs**:
   - **Site URL**: `https://bossofclean2.netlify.app`
   - **Redirect URLs**: 
     - `https://bossofclean2.netlify.app/**`
     - `http://localhost:3000/**` (for development)

4. **Security Settings**:
   - ✅ Enable "Secure email change"
   - ✅ Enable "Secure password change"
   - Set **minimum password length**: 8

### **Step 3: Set Up Email Templates**

1. **Go to**: Authentication > Email Templates

2. **Confirmation Email**:
   ```
   Subject: Welcome to Boss of Clean! Please confirm your email
   
   Body:
   <h2>Welcome to Boss of Clean!</h2>
   <p>Thanks for signing up. Please confirm your email address:</p>
   <p><a href="{{ .ConfirmationURL }}">Confirm your email</a></p>
   <p>If you didn't sign up, you can ignore this email.</p>
   ```

3. **Password Reset Email**:
   ```
   Subject: Reset your Boss of Clean password
   
   Body:
   <h2>Reset Your Password</h2>
   <p>Click the link below to create a new password:</p>
   <p><a href="{{ .ConfirmationURL }}">Reset Password</a></p>
   <p>This link expires in 24 hours.</p>
   ```

### **Step 4: Verify Environment Variables**

Make sure these are set in **Netlify > Site Settings > Environment Variables**:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
STRIPE_SECRET_KEY=sk_test_your-stripe-key
STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret
```

### **Step 5: Test the Setup**

1. **Create Test Account**:
   - Go to: https://bossofclean2.netlify.app/signup
   - Sign up with your email
   - Check email for confirmation link

2. **Verify Database**:
   - Check Supabase > Table Editor
   - Should see user in `users` table
   - Auth should work properly

3. **Test Cleaner Registration**:
   - Create a cleaner profile
   - Verify data appears in `cleaners` table

---

## 🗂️ **Database Schema Overview**

### **Core Tables Created:**

- **`users`** - User profiles (customers, cleaners, admins)
- **`cleaners`** - Cleaner business profiles and subscription info
- **`quote_requests`** - Customer quote requests to cleaners
- **`reviews`** - Customer reviews and ratings
- **`subscriptions`** - Stripe subscription management
- **`payments`** - Payment tracking and history
- **`service_areas`** - Detailed ZIP code coverage
- **`leads`** - Lead tracking and analytics
- **`florida_zipcodes`** - Florida ZIP code database

### **Key Features Enabled:**

✅ **User Authentication** - Email confirmation, password reset  
✅ **Role-based Access** - Customer, Cleaner, Admin roles  
✅ **Subscription Management** - FREE, Basic, Pro, Enterprise tiers  
✅ **Quote System** - Request, respond, accept workflow  
✅ **Review System** - Ratings and feedback  
✅ **Search & Filtering** - By location, service, rating  
✅ **Lead Tracking** - Analytics for cleaners  
✅ **Row Level Security** - Secure data access  

---

## 🚀 **After Setup:**

1. **Test user signup and login**
2. **Create your admin account** (update role to 'admin')
3. **Add sample cleaners** for testing
4. **Configure Stripe for payments**
5. **Start onboarding real cleaners**

Your Boss of Clean platform is now **fully functional** with a complete backend! 🎉