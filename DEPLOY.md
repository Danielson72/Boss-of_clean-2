# Boss of Clean - Netlify Deployment Guide

## Repository Information
- **GitHub Repository**: `Danielson72/Boss-of_clean-2`
- **Branch**: `chore/boc-speckit`
- **Latest Commit**: `454bde7 chore(netlify): add Next plugin + deploy checklist; set app title`

## Netlify Site Creation Steps

### 1. Create New Site
1. Go to [Netlify Dashboard](https://app.netlify.com)
2. Click **"Add new site"** → **"Import an existing project"**
3. Choose **GitHub** as your Git provider
4. Authorize Netlify to access your GitHub (if not already connected)
5. Search and select repository: **`Danielson72/Boss-of_clean-2`**

### 2. Configure Build Settings
- **Branch to deploy**: `chore/boc-speckit`
- **Build command**: `npm run build` (auto-detected from netlify.toml)
- **Publish directory**: `.next` (auto-detected from netlify.toml)
- **Node version**: 18 (configured in netlify.toml)

### 3. Environment Variables
Add the following environment variables in **Site settings → Environment variables**:

#### Supabase Configuration
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

#### Site Configuration
```
NEXT_PUBLIC_SITE_URL
SITE_URL
```

#### Stripe Configuration
```
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
STRIPE_SECRET_KEY
STRIPE_PRO_PRICE_ID
STRIPE_ENTERPRISE_PRICE_ID
```
*Note: `STRIPE_WEBHOOK_SECRET` will be added after webhook creation*

#### Google OAuth (Optional)
```
NEXT_PUBLIC_GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
```

### 4. Deploy Site
Click **"Deploy site"** to start the initial deployment.

## Post-Deployment Configuration

### Supabase Auth URL Configuration
1. Navigate to **Supabase Dashboard → Authentication → URL Configuration**
2. Update the following settings:
   - [ ] **Site URL**: `https://[your-netlify-site].netlify.app`
   - [ ] **Redirect URLs**: Add `https://[your-netlify-site].netlify.app/auth/callback`
3. Click **Save**

### Stripe Webhook Setup
1. Go to **Stripe Dashboard → Webhooks**
2. Click **"Add endpoint"**
3. Configure webhook:
   - [ ] **Endpoint URL**: `https://[your-netlify-site].netlify.app/api/stripe/webhook`
   - [ ] **Description**: Boss of Clean Netlify Production
   - [ ] **Events to send**:
     - `checkout.session.completed`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
4. Click **"Add endpoint"**
5. Copy the **Signing secret** (starts with `whsec_`)
6. Add to Netlify environment variables:
   - [ ] Variable name: `STRIPE_WEBHOOK_SECRET`
   - [ ] Value: The signing secret you copied
7. Trigger a redeploy in Netlify to apply the new environment variable

### Update Site URLs in Netlify
After your site is deployed and you have the URL:
1. Go to **Netlify → Site settings → Environment variables**
2. Update these variables with your actual Netlify URL:
   - [ ] `NEXT_PUBLIC_SITE_URL` = `https://[your-netlify-site].netlify.app`
   - [ ] `SITE_URL` = `https://[your-netlify-site].netlify.app`
3. Click **"Save"** and trigger a redeploy

## Post-Deployment Verification Checklist

### Basic Functionality
- [ ] Homepage loads with "Boss of Clean" title
- [ ] Navigation shows "Login" and "Sign Up" when logged out
- [ ] Footer links are functional
- [ ] Mobile responsive design works

### Authentication Flow
- [ ] `/signup` page renders with form
- [ ] Can create new account
- [ ] Email confirmation works (if enabled in Supabase)
- [ ] `/login` page renders with form
- [ ] Can log in with credentials
- [ ] Google OAuth button appears (if configured)
- [ ] Logout functionality works

### Role-Based Dashboards
- [ ] Customer dashboard accessible at `/dashboard/customer`
- [ ] Cleaner dashboard accessible at `/dashboard/cleaner`
- [ ] Admin dashboard accessible at `/dashboard/admin`
- [ ] Unauthorized access redirects to login
- [ ] Role-based redirects work correctly

### Stripe Integration
- [ ] `/pricing` page displays all three plans
- [ ] "Start Professional" button initiates Stripe Checkout
- [ ] "Start Enterprise" button initiates Stripe Checkout
- [ ] Test payment with card `4242 4242 4242 4242` works
- [ ] Successful payment redirects back to dashboard
- [ ] Subscription tier updates in database
- [ ] "Manage Billing" opens Stripe Customer Portal

### Webhook Functionality
- [ ] Stripe webhook endpoint responds with 200 status
- [ ] Subscription creation updates database
- [ ] Subscription cancellation downgrades to free tier
- [ ] Webhook events appear in Stripe dashboard

### Error Handling
- [ ] 404 page renders for invalid routes
- [ ] Protected routes redirect when not authenticated
- [ ] API errors display user-friendly messages

## Troubleshooting

### Common Issues and Solutions

#### Site won't build
- Check all environment variables are set correctly
- Verify Node version is 18 in build logs
- Check for TypeScript errors in build output

#### Authentication not working
- Verify Supabase URL and keys are correct
- Check redirect URLs in Supabase match your Netlify URL
- Ensure cookies are enabled in browser

#### Stripe checkout fails
- Confirm you're using correct Stripe keys (test mode for staging)
- Verify price IDs exist in your Stripe account
- Check webhook endpoint is accessible

#### Middleware errors
- Ensure all required environment variables are present
- Check Supabase connection is working
- Verify service role key has proper permissions

## Deployment Commands Reference

### Trigger Manual Deploy
```bash
# If you have Netlify CLI installed
netlify deploy --prod
```

### Check Deploy Status
```bash
netlify status
```

### View Deploy Logs
```bash
netlify logs:function
```

## Support Resources

- [Next.js on Netlify Documentation](https://docs.netlify.com/integrations/frameworks/next-js/)
- [Supabase Authentication Docs](https://supabase.com/docs/guides/auth)
- [Stripe Webhooks Guide](https://stripe.com/docs/webhooks)
- [Netlify Environment Variables](https://docs.netlify.com/environment-variables/)

## Security Reminders

- Never commit `.env.local` or any file containing secrets
- Use different Stripe keys for test and production
- Regularly rotate API keys and secrets
- Enable 2FA on GitHub, Netlify, Supabase, and Stripe accounts
- Monitor webhook delivery in Stripe dashboard
- Review Supabase RLS policies regularly

---

*Last updated: Deploy from branch `chore/boc-speckit` with Next.js 13.5.1 and Supabase Auth*