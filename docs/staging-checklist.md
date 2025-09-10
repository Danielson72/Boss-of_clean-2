# Staging Deployment Checklist

This checklist provides step-by-step instructions for deploying Boss of Clean to Netlify staging environment.

## 1. Netlify Environment Variables

Configure the following environment variables in your Netlify site settings (Site settings → Environment variables):

### Supabase Configuration
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Site Configuration
```bash
# Use your actual Netlify domain
NEXT_PUBLIC_SITE_URL=https://your-site-name.netlify.app
SITE_URL=https://your-site-name.netlify.app
```

### Stripe Configuration (Test Mode)
```bash
# Get these from Stripe Dashboard (Test mode)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Create these products in Stripe Dashboard first
STRIPE_PRO_PRICE_ID=price_test_pro_monthly
STRIPE_ENTERPRISE_PRICE_ID=price_test_enterprise_monthly
```

### Google OAuth (Currently Disabled)
```bash
# Leave empty for now - Google OAuth is disabled
NEXT_PUBLIC_GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

## 2. Supabase Authentication Configuration

### 2.1 Update Site URL
1. Go to your Supabase project dashboard
2. Navigate to **Authentication → Settings**
3. Update **Site URL** to: `https://your-site-name.netlify.app`

### 2.2 Configure Redirect URLs
1. In the same Authentication Settings page
2. Update **Redirect URLs** to include:
   ```
   https://your-site-name.netlify.app/auth/callback
   https://your-site-name.netlify.app/**
   ```
3. **Save** the configuration

### 2.3 Email Templates (Optional)
- Update email template redirect URLs if using custom email templates
- Ensure all links point to your staging domain

## 3. Stripe Webhook Configuration

### 3.1 Create Webhook Endpoint
1. Login to [Stripe Dashboard](https://dashboard.stripe.com) (Test mode)
2. Go to **Developers → Webhooks**
3. Click **Add endpoint**
4. Set **Endpoint URL**: `https://your-site-name.netlify.app/api/stripe/webhook`
5. Select **Events to send**:
   - `checkout.session.completed`
   - `customer.subscription.updated` 
   - `customer.subscription.deleted`
6. Click **Add endpoint**

### 3.2 Configure Webhook Secret
1. Click on your newly created webhook endpoint
2. Copy the **Signing secret** (starts with `whsec_`)
3. Add it to Netlify environment variables as `STRIPE_WEBHOOK_SECRET`

### 3.3 Create Subscription Products
1. Go to **Products** in Stripe Dashboard
2. Create two products:

   **Professional Plan:**
   - Name: "Professional Plan"
   - Pricing: $79.00 USD per month, recurring
   - Copy the **Price ID** (starts with `price_`) → use for `STRIPE_PRO_PRICE_ID`

   **Enterprise Plan:**
   - Name: "Enterprise Plan"  
   - Pricing: $149.00 USD per month, recurring
   - Copy the **Price ID** (starts with `price_`) → use for `STRIPE_ENTERPRISE_PRICE_ID`

## 4. Verification Checklist

Test the following functionality in order after deployment:

### 4.1 Basic Site Access
- [ ] Site loads at staging URL
- [ ] Navigation works correctly
- [ ] Static pages load (home, about, etc.)

### 4.2 Authentication Flow
- [ ] **Signup Process:**
  - Go to `/signup`
  - Create account with email/password
  - Check email for confirmation link
  - Confirm account and login

- [ ] **Login Process:**
  - Go to `/login`  
  - Login with created account
  - Redirected to appropriate dashboard

- [ ] **Logout Process:**
  - Click logout from any dashboard
  - Redirected to home page
  - Cannot access protected routes

### 4.3 Dashboard Route Protection
- [ ] **Customer Dashboard** (`/dashboard/customer`):
  - Accessible only when logged in as customer
  - Redirects to login when not authenticated

- [ ] **Cleaner Dashboard** (`/dashboard/cleaner`):
  - Accessible only when logged in as cleaner  
  - Redirects to cleaner setup if no profile exists
  - Shows subscription status correctly

### 4.4 Pricing & Checkout Flow
- [ ] **Pricing Page** (`/pricing`):
  - All three plans display correctly (Free, Pro $79, Enterprise $149)
  - Free plan button redirects to `/signup`

- [ ] **Checkout Process (Pro Plan):**
  - Login as cleaner with profile
  - Click "Start Professional" on pricing page
  - Redirected to Stripe Checkout
  - Complete payment with test card: `4242 4242 4242 4242`
  - Redirected back to cleaner dashboard
  - **Verify subscription tier updated to 'pro' in dashboard**

- [ ] **Checkout Process (Enterprise Plan):**
  - Repeat above process for Enterprise plan
  - **Verify subscription tier updated to 'enterprise' in dashboard**

### 4.5 Webhook Processing
- [ ] **Test Webhook Delivery:**
  - Go to Stripe Dashboard → Webhooks → Your endpoint
  - Check **Recent deliveries** for successful 200 responses
  - If failures, check Netlify function logs for errors

- [ ] **Database Sync Verification:**
  - Complete a checkout process
  - Check that `cleaners.subscription_tier` updated in Supabase
  - Cancel subscription in Stripe Dashboard
  - Verify tier reverts to 'free' in cleaner dashboard

### 4.6 Billing Portal Access
- [ ] **For Paid Subscribers:**
  - Login as cleaner with active subscription  
  - Go to cleaner dashboard
  - Click "Manage Billing →"
  - Redirected to Stripe billing portal
  - Verify can view/modify subscription

- [ ] **For Free Plan Users:**
  - Login as cleaner with free plan
  - Go to cleaner dashboard  
  - Should see "Upgrade Plan →" instead of billing management

## 5. Common Issues & Solutions

### 5.1 Webhook Failures
**Issue**: Webhooks returning 500 errors
- Check `STRIPE_WEBHOOK_SECRET` matches Stripe dashboard
- Verify webhook URL is correct and accessible
- Check Netlify function logs for specific errors

### 5.2 Authentication Redirects
**Issue**: Auth callback not working
- Verify `NEXT_PUBLIC_SITE_URL` matches actual domain
- Check Supabase redirect URLs include your staging domain
- Ensure no trailing slashes in URL configuration

### 5.3 Checkout Not Working  
**Issue**: Checkout fails or doesn't redirect back
- Verify `STRIPE_SECRET_KEY` and `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` are correct
- Check that price IDs exist in Stripe dashboard
- Ensure user is logged in and has cleaner profile

### 5.4 Subscription Status Not Updating
**Issue**: Dashboard shows wrong subscription tier
- Check webhook delivery in Stripe dashboard
- Verify webhook secret matches
- Look for processing errors in Netlify function logs
- Manually trigger webhook test event in Stripe

## 6. Testing Checklist Summary

**Complete this verification after deployment:**

- [ ] Site loads and navigation works
- [ ] User signup/login/logout flows work
- [ ] Protected routes redirect appropriately  
- [ ] Pricing page displays correctly
- [ ] Stripe checkout completes successfully
- [ ] Webhooks process and update database
- [ ] Billing portal accessible for paid users
- [ ] Free users see upgrade option
- [ ] All environment variables configured
- [ ] Supabase auth URLs updated
- [ ] Stripe webhook endpoint created and working

## 7. Production Deployment Notes

When ready for production:

1. **Switch Stripe to live mode:**
   - Update all `STRIPE_*` environment variables to live keys
   - Recreate products and webhook endpoints in live mode

2. **Update domain references:**
   - Change `SITE_URL` and `NEXT_PUBLIC_SITE_URL` to production domain  
   - Update Supabase auth configuration for production domain
   - Update Stripe webhook URL to production endpoint

3. **Security review:**
   - Ensure all secrets are properly configured
   - Review CORS settings in Supabase
   - Verify webhook signature validation is working

---

**🎉 Staging deployment complete when all checklist items are verified!**