# SOTSVC Contact Form - Quick Deployment Guide

## 🚀 Ready to Deploy

The frontend implementation is complete and pushed to branch `feature/contact-forms-frontend`.

---

## ✅ Pre-Deployment Checklist

### Backend Requirements (Must be completed first)

**Claude Code** should have completed these tasks:

- [ ] Created `contact_requests` table in Supabase
- [ ] Enabled Row Level Security (RLS) with anon insert policy
- [ ] Created Edge Function `notify_contact`
- [ ] Deployed Edge Function to Supabase
- [ ] Created database trigger `tg_contact_email`
- [ ] Configured Resend API key in Supabase secrets

**Verify backend setup:**
```bash
# Check if table exists
supabase db diff

# Check if function is deployed
supabase functions list

# Check if secrets are set
supabase secrets list
```

---

## 🔧 Deployment Steps

### 1. Set Environment Variables

In your deployment platform (Vercel/Netlify), add these variables:

```env
NEXT_PUBLIC_SUPABASE_URL=https://jvznxszxlqtvizpjokav.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2em54c3p4bHF0dml6cGpva2F2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzUzNTk0MDgsImV4cCI6MjA1MDkzNTQwOH0.qAif43DwA-QQ-A2a8U4KnnuHCrMvWfb6I7AUJQrKCL4
NEXT_PUBLIC_SITE_URL=https://sotsvc.com
SITE_URL=https://sotsvc.com
```

### 2. Merge and Deploy

```bash
# Option A: Merge via GitHub PR
# 1. Go to: https://github.com/Danielson72/Boss-of_clean-2/pull/new/feature/contact-forms-frontend
# 2. Create Pull Request
# 3. Review changes
# 4. Merge to main
# 5. Auto-deploy triggers

# Option B: Merge locally
git checkout main
git merge feature/contact-forms-frontend
git push origin main
```

### 3. Test Immediately After Deploy

1. **Visit the live site:** https://sotsvc.com
2. **Navigate to contact page:** https://sotsvc.com/contact
3. **Fill out and submit the form** with a real email address
4. **Verify:**
   - ✅ Success message appears
   - ✅ Row appears in Supabase `contact_requests` table
   - ✅ Email received at dalvarez@sotsvc.com (within 5 seconds)
   - ✅ Auto-reply received at your test email

---

## 🧪 Testing Protocol

### Test Case 1: Embedded Form (Home Page)

1. Go to https://sotsvc.com
2. Scroll to "Get in Touch" section
3. Fill out form:
   - Full Name: Test User
   - Email: your-email@example.com
   - Phone: (407) 123-4567
   - Message: Testing embedded form
4. Click "Send"
5. Verify success message
6. Check Supabase table for entry with `form_type = 'embedded'`

### Test Case 2: Standalone Form (Contact Page)

1. Go to https://sotsvc.com/contact
2. Fill out form with different details
3. Submit and verify
4. Check Supabase table for entry with `form_type = 'standalone'`

### Test Case 3: Email Delivery

1. Submit form with your real email
2. Check dalvarez@sotsvc.com inbox (should arrive in < 5 sec)
3. Check your email for auto-reply confirmation
4. Verify email content is correct

---

## 🐛 Troubleshooting

### Form Submits But No Email

**Check:**
1. Supabase Edge Function logs: https://supabase.com/dashboard/project/jvznxszxlqtvizpjokav/functions
2. Resend API key is configured: `supabase secrets list`
3. Edge Function is deployed: `supabase functions list`

**Fix:**
```bash
# Redeploy Edge Function
cd supabase/functions/notify_contact
supabase functions deploy notify_contact
```

### Form Doesn't Submit (Error Message)

**Check:**
1. Browser console for errors (F12)
2. Network tab for failed requests
3. Supabase table exists and has correct schema
4. RLS policy allows anon insert

**Fix:**
```sql
-- Verify RLS policy
SELECT * FROM pg_policies WHERE tablename = 'contact_requests';

-- Should show policy: "Anon insert" with check = true
```

### Environment Variables Not Working

**Check:**
1. Variables are set in deployment platform (Vercel/Netlify)
2. Variables start with `NEXT_PUBLIC_` for client-side access
3. Redeploy after adding variables

**Fix:**
- Vercel: Settings > Environment Variables > Add > Redeploy
- Netlify: Site Settings > Environment Variables > Add > Trigger Deploy

---

## 📊 Monitoring

### First 48 Hours

**Watch these metrics:**

1. **Supabase Dashboard**
   - Table Editor: Check new rows in `contact_requests`
   - Edge Functions: Monitor `notify_contact` invocations and errors
   - Database: Check for any performance issues

2. **Email Delivery**
   - Resend Dashboard: Check delivery rates
   - Spam folder: Verify emails not marked as spam
   - Bounce rate: Should be 0% for valid emails

3. **User Experience**
   - Test forms daily
   - Check for console errors
   - Monitor page load times

### Success Criteria

- ✅ 100% form submissions reach database
- ✅ 100% email delivery rate (for valid addresses)
- ✅ < 5 second email delivery time
- ✅ 0 console errors
- ✅ 0 Edge Function errors

---

## 🎯 Post-Launch Tasks

### Immediate (Week 1)

- [ ] Remove old GHL iframe embeds (if any remain)
- [ ] Archive GHL forms in dashboard
- [ ] Monitor email delivery for 7 days
- [ ] Collect user feedback

### Short-term (Month 1)

- [ ] Analyze form submission data
- [ ] Optimize form fields based on usage
- [ ] A/B test form placement
- [ ] Add analytics tracking

### Long-term (Quarter 1)

- [ ] Replicate to TrustedCleaningExpert.com
- [ ] Replicate to JMHomeDecor.com
- [ ] Add form analytics dashboard
- [ ] Implement spam protection if needed

---

## 📞 Support Contacts

**Frontend Implementation:** Manus AI  
**Backend Implementation:** Claude Code  
**Project Owner:** Brother Daniel (dalvarez@sotsvc.com)  
**Phone:** (407) 461-6039

---

## 🔗 Important Links

- **GitHub Repo:** https://github.com/Danielson72/Boss-of_clean-2
- **Feature Branch:** https://github.com/Danielson72/Boss-of_clean-2/tree/feature/contact-forms-frontend
- **Create PR:** https://github.com/Danielson72/Boss-of_clean-2/pull/new/feature/contact-forms-frontend
- **Supabase Project:** https://supabase.com/dashboard/project/jvznxszxlqtvizpjokav
- **Live Site:** https://sotsvc.com

---

## ✨ Final Notes

This implementation follows best practices for:
- ✅ Type safety (TypeScript)
- ✅ Accessibility (semantic HTML, ARIA labels)
- ✅ User experience (loading states, error handling)
- ✅ Security (RLS policies, environment variables)
- ✅ Maintainability (reusable components, clear documentation)

**Ready to serve with excellence! 🙏**

_"Whatever you do, work at it with all your heart, as working for the Lord, not for human masters."_ — Colossians 3:23

