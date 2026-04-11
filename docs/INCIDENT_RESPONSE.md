# Incident Response Plan — Boss of Clean

## Severity Levels

| Level | Definition | Response Target | Examples |
|-------|-----------|----------------|----------|
| **SEV-1** | Data breach or financial exposure | **15 minutes** | Leaked keys, unauthorized DB access, payment fraud, admin takeover |
| **SEV-2** | Service degraded, no data exposure | **1 hour** | API errors spiking, auth failures, webhook failures, site down |
| **SEV-3** | Monitoring alert, no user impact | **Next business day** | Rate limit spikes, failed cron jobs, cert expiry warnings |

---

## Scenario 1: Exposed Supabase Service Role Key

**Severity:** SEV-1

### Immediate Actions (< 5 min)

1. Go to Supabase Dashboard > Project Settings > API > Regenerate service_role key
2. Update the key in Netlify env vars: `SUPABASE_SERVICE_ROLE_KEY`
3. Update the key in n8n credentials (Supabase nodes)
4. Trigger a Netlify redeploy to pick up the new key
5. Search git history: `git log -p --all -S 'the_exposed_key_prefix'` to find the commit that leaked it

### Notify

- Daniel (owner) — immediately
- Supabase support (support@supabase.io) — within 1 hour if key was used by a third party

### Time-to-Containment Target

**5 minutes** from detection to key rotation.

### Customer Notification Template

> We identified and rotated a compromised infrastructure credential on [DATE].
> No customer data was accessed. The credential was revoked within [X] minutes
> of detection. No action is required on your part.

### Post-Mortem Checklist

- [ ] How was the key exposed? (commit, log, env leak, screenshot)
- [ ] Was the key used by an unauthorized party? (check Supabase logs)
- [ ] Add pre-commit hook to scan for secrets (`git-secrets` or `gitleaks`)
- [ ] Audit all env vars for other potential leaks
- [ ] Update CLAUDE.md with secret-handling rules if needed

---

## Scenario 2: Unauthorized Database Access Detected

**Severity:** SEV-1

### Immediate Actions (< 5 min)

1. Check Supabase Logs > Postgres for unfamiliar queries or IPs
2. Regenerate the anon key AND service_role key in Supabase Dashboard
3. Revoke all active user sessions: `SELECT auth.sign_out_all();` via SQL Editor
4. Enable Supabase Network Restrictions if not already set (Settings > Network)
5. Check RLS policies: `SELECT tablename, policyname, permissive, cmd FROM pg_policies WHERE schemaname = 'public';`

### Notify

- Daniel (owner) — immediately
- Supabase support — within 30 minutes
- Affected customers — within 72 hours if PII was accessed (Florida breach notification law)

### Time-to-Containment Target

**15 minutes** from detection to credential rotation + session revocation.

### Customer Notification Template

> We detected unauthorized access to our database on [DATE] at [TIME] ET.
> We immediately revoked all access credentials and active sessions.
> The following data may have been exposed: [SPECIFY].
> We recommend you [change your password / monitor for suspicious activity].
> Contact us at admin@bossofclean.com with any questions.

### Post-Mortem Checklist

- [ ] Determine attack vector (exposed key, SQL injection, RLS bypass, compromised account)
- [ ] Audit all RLS policies for gaps
- [ ] Review Supabase auth logs for the attacker's session
- [ ] Check if any data was exfiltrated (row counts, export patterns)
- [ ] File report if required by Florida data breach law (500+ affected individuals)
- [ ] Add database activity monitoring/alerting

---

## Scenario 3: Fake/Unrecognized Stripe Webhook Received

**Severity:** SEV-2 (SEV-1 if payments were processed)

### Immediate Actions (< 5 min)

1. Check Stripe Dashboard > Developers > Webhooks > Recent Events for signature mismatches
2. Verify webhook endpoint validates signatures: grep for `stripe.webhooks.constructEvent` in codebase
3. If signature validation is missing or bypassed, disable the webhook endpoint in Stripe immediately
4. Check `lead_charges` / `lead_unlocks` tables for any records created by the fake webhook
5. Rotate the webhook signing secret in Stripe Dashboard and update `STRIPE_WEBHOOK_SECRET` in Netlify

### Notify

- Daniel (owner) — immediately
- Stripe support — if fraudulent payments were processed

### Time-to-Containment Target

**15 minutes** to disable endpoint or rotate secret. **1 hour** to audit affected records.

### Customer Notification Template

> We identified a payment processing irregularity on [DATE].
> No customer payment methods were compromised.
> [If charges were affected]: We have initiated refunds for [X] affected transactions.
> You should see the refund within 5-10 business days.

### Post-Mortem Checklist

- [ ] Was webhook signature verification present and working?
- [ ] Were any fraudulent charges processed? Refund them
- [ ] Were any lead_unlocks or subscriptions incorrectly granted?
- [ ] Add webhook event logging to a dedicated table for audit trail
- [ ] Add alerting for webhook signature failures (n8n or Supabase edge function)

---

## Scenario 4: Active Prompt Injection in AI Agent

**Severity:** SEV-2 (SEV-1 if it accessed production data or took actions)

### Immediate Actions (< 5 min)

1. Stop the affected agent/workflow immediately (n8n > Workflows > Deactivate)
2. Review the agent's recent execution logs for unauthorized actions
3. Check if the agent wrote to any database tables: review Supabase logs for INSERT/UPDATE/DELETE from the agent's IP or service account
4. Revoke the agent's API keys or credentials if it has dedicated ones
5. Quarantine the input that triggered the injection (save it for analysis)

### Notify

- Daniel (owner) — immediately
- Any affected customers if their data was accessed or modified

### Time-to-Containment Target

**5 minutes** to deactivate workflow. **30 minutes** to audit all actions taken.

### Customer Notification Template

> We identified and resolved an issue with an automated system on [DATE].
> The system was immediately deactivated.
> [If data affected]: Your [SPECIFY] data may have been incorrectly processed.
> We have corrected all affected records. Contact admin@bossofclean.com with questions.

### Post-Mortem Checklist

- [ ] What input triggered the injection? (user-submitted content, external API response, scraped data)
- [ ] What actions did the agent take after injection?
- [ ] Add input sanitization before AI processing
- [ ] Add output validation after AI processing (never trust agent output for DB writes)
- [ ] Reduce agent permissions to minimum required (read-only where possible)
- [ ] Add rate limits on agent actions (max writes per execution)

---

## Scenario 5: Admin Account Takeover

**Severity:** SEV-1

### Immediate Actions (< 5 min)

1. Revoke the compromised admin's session: `UPDATE auth.sessions SET not_after = now() WHERE user_id = '<admin_user_id>';`
2. Reset the admin's password via Supabase Dashboard > Authentication > Users
3. Check `users` table for unauthorized role changes: `SELECT * FROM users WHERE role = 'admin';`
4. Review recent admin actions: check Supabase logs filtered by the admin's user ID
5. Verify `handle_new_user()` trigger still restricts role to `['customer', 'cleaner']` (prevents attacker from creating new admin accounts)

### Notify

- Daniel (owner) — immediately (if Daniel IS the compromised admin, use backup access via Supabase Dashboard)
- All other admins — immediately, require password reset

### Time-to-Containment Target

**5 minutes** to revoke session and reset password. **15 minutes** to audit all admin actions.

### Customer Notification Template

> We detected unauthorized access to an administrative account on [DATE].
> The account was immediately locked and all sessions revoked.
> [If data affected]: We are reviewing all actions taken during the compromise window
> and will notify you if your data was affected.

### Post-Mortem Checklist

- [ ] How was the account compromised? (phishing, credential stuffing, session hijack, weak password)
- [ ] What actions did the attacker take? (data export, role changes, config changes)
- [ ] Were any new admin accounts created? Remove them
- [ ] Were any RLS policies or triggers modified?
- [ ] Enable MFA for all admin accounts (Supabase Dashboard > Auth > MFA)
- [ ] Add admin action audit logging (create `admin_audit_log` table with trigger)
- [ ] Review and tighten admin session expiry (reduce from default)

---

## General Incident Checklist

Every incident, regardless of scenario:

1. **Detect** — How was it found? (monitoring, user report, manual discovery)
2. **Contain** — Stop the bleeding. Revoke, disable, block
3. **Assess** — What was the blast radius? What data/systems were affected?
4. **Remediate** — Fix the root cause, not just the symptom
5. **Notify** — Tell affected parties within required timeframes
6. **Document** — Write post-mortem within 48 hours
7. **Improve** — Add monitoring/alerting to catch it faster next time

## Contact List

| Role | Contact | Method |
|------|---------|--------|
| Owner/Admin | Daniel Alvarez | admin@bossofclean.com |
| Supabase Support | — | support@supabase.io |
| Stripe Support | — | Stripe Dashboard > Support |
| Netlify Support | — | Netlify Dashboard > Support |
| Resend Support | — | Resend Dashboard > Support |
