# ADR-001 Addendum 002: Pricing Lock-In + Launch Hardening

**Status:** ✅ LOCKED for v1.0 build
**Date:** May 10, 2026
**Owner:** Daniel Alvarez, Founder
**Repository path:** `/docs/architecture/ADR-001_Addendum_002_Pricing_and_Launch_Hardening.md`
**Parent documents:** ADR-001, Messaging Spec v1.1, ADR-001 Addendum (Deferred Items)
**Supersedes:** Pro tier "30 leads included" language anywhere in prior specs.

---

> *"For which of you, intending to build a tower, sitteth not down first, and counteth the cost, whether he have sufficient to finish it?"* — Luke 14:28 (KJV)

This addendum captures three sets of decisions made during the May 10, 2026 strategic review session: the locked v1 pricing structure with corrected language, the Founding Pros lifetime perk, and the explicit pre-launch refund test requirements.

These decisions are not negotiable during the build. Decided once, locked now, do not revisit until post-launch.

---

## 1. Locked v1 Pricing Structure

### Pro Tier — $199/month
- **Standard cap:** Up to **20 leads covered** per month
- **Overflow rate:** $15 per lead beyond the cap
- **Per-covered-lead cost:** $9.95 (vs Thumbtack avg $35-50, Angi $20-100)
- **Priority benefits:**
  - 15-minute exclusive lead window (T+0 to T+15)
  - Top 3 search placement
  - Featured Pro badge
  - Lower overflow rate ($15 vs $20 Basic, $25-$45 Free)

### Basic Tier — $79/month
- **Cap:** Up to **10 leads covered** per month (unchanged)
- **Overflow rate:** $20 per lead beyond the cap
- **Per-covered-lead cost:** $7.90
- **Benefits:**
  - 30-minute window (T+15 to T+45)
  - Slots 4-10 search placement
  - Verified badge

### Free Tier — $0/month
- **No cap** — pay per accepted lead
- **Per-lead rates:**
  - $25 — Standard (house cleaning, lawn, handyman)
  - $35 — Premium (deep clean, move-out, pressure washing)
  - $45 — High-ticket (pool service, pest control, post-construction)
- **Window:** T+45 onwards, until accepted or 24h max
- **Position:** Slot 11+ in search results

### Price Ladder Logic
- Basic: $79 / 10 leads = $7.90 per covered lead
- Pro: $199 / 20 leads = $9.95 per covered lead
- Pro pays $2/lead more than Basic on the surface — that premium buys priority access (the real value)

### Marketing Language (CRITICAL)

**ALWAYS use "up to X leads covered" or "your subscription covers up to X leads":**
- ✅ "Pro tier covers up to 20 leads per month at no extra charge"
- ✅ "Your subscription includes coverage for up to 20 accepted leads each month"
- ✅ "Beyond 20, overflow leads are just $15 each"

**NEVER use language that sounds like a guaranteed delivery:**
- ❌ "Pro tier — 20 leads included" (sounds like a promise)
- ❌ "Get 20 leads per month" (sounds like a guarantee)
- ❌ "We deliver 20 leads to you each month" (legal liability if volume is low)

**Why:** A guarantee creates breach-of-contract exposure if lead volume is below the cap in early months. "Up to" framing positions the cap as a benefit ceiling (no overflow charges), not a delivery commitment.

The pros are paying for **priority access** (15-minute exclusive window) and **trust signals** (badge, placement). The lead cap is a benefit ceiling, not a service guarantee.

---

## 2. Founding Pros Lifetime Loyalty Perk

The first 100 Pro tier signups receive enhanced lifetime benefits as a covenant-grade loyalty program.

### Founders Offer Mechanics

**At signup:**
- First 6 months at $79/month (60% off standard $199)
- After 6 months, auto-bump to $199/month (continues as Pro tier)
- Permanent "Founding Pro" badge displayed on profile
- **Permanent benefit: up to 30 leads covered per month for life** (instead of standard up to 20)

### Continuity Requirement (CRITICAL)

The "up to 30 leads covered" perk persists **only while the Pro is continuously subscribed**.

If the Founding Pro:
- ✅ Stays continuously subscribed → keeps up to 30 leads covered for life
- ✅ Has a temporary payment failure that is recovered via dunning → keeps the perk (subscription was never canceled)
- ❌ Cancels their Pro subscription at any point → permanently loses the up-to-30 perk
- ❌ Reactivates after cancellation → joins as standard Pro tier (up to 20 leads covered)

**The "Founding Pro" badge is permanent regardless of subscription status** — it's a marketing/trust signal that they were among the first 100. Only the up-to-30 leads benefit is conditional on continuous subscription.

### Why Continuity-Required

This structure rewards loyalty (not just early signup), creates churn resistance, self-limits the cost (pros who quit don't get lifetime perks), and is easy to explain ("Stay loyal, stay covered").

This is the same model airlines use for lifetime elite status — it's only "lifetime" if you keep flying with them.

### Implementation Notes

The infrastructure is already in place from Phase A1:
- `cleaners.is_founding_pro` (boolean)
- `cleaners.founding_pro_discount_ends_at` (timestamptz)
- `cleaners.monthly_lead_cap_override` (integer)
- `cleaners.subscription_status` (active/past_due/canceled/paused)

When deciding which cap to apply for a Pro tier subscriber, the rule is:

```
IF cleaners.subscription_tier = 'pro'
   AND cleaners.is_founding_pro = true
   AND cleaners.subscription_status = 'active' (or 'past_due' during dunning)
THEN effective_cap = 30
ELSE IF cleaners.subscription_tier = 'pro'
THEN effective_cap = COALESCE(cleaners.monthly_lead_cap_override, 20)
ELSE IF cleaners.subscription_tier = 'basic'
THEN effective_cap = COALESCE(cleaners.monthly_lead_cap_override, 10)
ELSE  -- free tier
THEN effective_cap = 0  -- no covered leads
```

When a Founding Pro's subscription_status transitions to 'canceled', a Stripe webhook handler clears or invalidates their founding_pro perk eligibility. If they ever reactivate, they enter as standard Pro tier (no 30-cap perk).

### Founding Pro Counter

System tracks:
- Total `is_founding_pro = true` count via index `idx_cleaners_founding_pro_count`
- Stops accepting new Founding Pro signups at 100
- Admin notification fires when 90, 95, 99, and 100 are reached
- After 100, new Pro signups go straight to $199/month with 20 leads cap

---

## 3. Pre-Launch Refund Test Requirements (Phase G Hardening)

The five refund test scenarios are now explicit pre-launch blockers. None of these can be skipped or marked "completed" without verifiable evidence in Stripe Dashboard and `notification_logs` table.

### Test 1: Successful Capture After Customer Response (Free Tier)
**Setup:** Test pro accepts a lead. Test customer responds within 48 hours.
**Expected:**
- At acceptance: $25 (or appropriate tier amount) authorized on test pro's card
- After customer response: capture event fires
- `lead_acceptances.captured_at` populated
- Stripe Dashboard shows successful charge
- Test pro receives `pro_lead_acceptance_confirmed` SMS + email
- Test customer receives `cust_quote_received` notification
- $23.97 (after Stripe fees) reflected in pending Stripe balance

**Pass criteria:** All 6 events confirmed in correct order, no duplicate charges, no failed notifications.

### Test 2: Auto-Refund After Customer Non-Response (48-hour timeout)
**Setup:** Test pro accepts a lead. Test customer does NOT respond.
**Expected:**
- At T+47 hours: `pro_auto_refund_pending` SMS fires (early warning)
- At T+48 hours: Stripe authorization void fires
- `refund_decisions` row created with state='auto_approved', trigger_reason='customer_non_response'
- `lead_acceptances.voided_at` populated
- Test pro receives `pro_auto_refund_complete` email
- Stripe Dashboard shows void (no charge)
- Test pro's card never has $25 actually charged

**Pass criteria:** Money never moves. All audit trail entries created. No pro complaints possible.

### Test 3: Auto-Refund After 7-Day Customer Silence (Read-but-no-engagement)
**Setup:** Test pro accepts. Customer reads pro's first message but never replies for 7 days.
**Expected:**
- At T+7 days: refund_decisions row created with state='auto_approved', trigger_reason='customer_silence_7_days'
- Either void (if still in auth window) or refund (if already captured)
- Test pro notified

**Pass criteria:** Refund processed correctly regardless of whether capture already happened.

### Test 4: Duplicate Lead Auto-Detection
**Setup:** Test customer submits lead. Test pro accepts. Same customer submits another lead in same vertical, same address, within 7 days.
**Expected:**
- System flags duplicate
- Auto-refund fires for the second lead's pro before they even get charged
- Admin alert fires for review

**Pass criteria:** Duplicate detection works without false positives on legitimate repeat customers.

### Test 5: Stripe Webhook Failure + Retry Recovery
**Setup:** Use Stripe test mode to simulate webhook delivery failure during a refund event.
**Expected:**
- Worker registers failure, increments retry_count
- Exponential backoff retry schedule kicks in (30s, 2m, 8m, 30m, 2h)
- Eventually webhook succeeds, refund processes correctly
- No duplicate refunds despite retries (idempotency rules from Messaging Spec v1.1 Section 5d enforce uniqueness)

**Pass criteria:** Resilience under transient failures. No money lost, no duplicate charges.

### Daily Refund Monitoring Post-Launch

After launch, Daniel personally reviews refund decisions for the first 50 lead acceptances:
- Stripe Dashboard verification within 72 hours of each event
- `refund_decisions` table query daily for any 'manual_review' or 'escalated' states
- Stripe chargeback rate alert configured at 0.5% (industry threshold is 1.0%)

After the first 50, transition to weekly audit cadence.

---

## 4. Updates Required to Other Documents

When this addendum is committed, the following documents need text updates to reflect the locked pricing:

### ADR-001 Section 2 (Tiers & Pricing)
- Pro tier cap: change from 30 to 20
- Add Founding Pros perk paragraph
- Update marketing language guidance

### Messaging Spec v1.1 Section 9 (Founders Offer Notification Flow)
- Add `pro_lifetime_perk_explanation` template — sent at month 5 of Founders Offer to remind Founding Pros what they keep when prices return to $199
- Add `pro_perk_lost_warning` template — fired if a Founding Pro's subscription enters 'past_due' or cancellation flow

### Marketing copy on /pricing page
- Change all "30 leads included" → "Up to 20 leads covered"
- Add Founding Pros section with the "up to 30 leads covered for life" perk
- Founders counter: "X / 100 Founding Pro spots claimed"

### Stripe product metadata
- `BOC Pro Subscription` (`prod_UTor52cGfSxK96`): add metadata `included_lead_cap: 20`
- `BOC Pro Overflow Lead` (`prod_UTp67iuasYmqLb`): no change
- `BOC Basic Subscription` (`prod_UTovUHqQhOwEHk`): metadata `included_lead_cap: 10` (unchanged)

These updates can be made during Phase B (Stripe wiring) and Phase H (launch prep). They are not Phase A blockers.

---

## 5. Sign-Off

This is the locked v1.0 pricing structure with corrected language and explicit pre-launch quality gates.

**Signed:** Daniel Alvarez, Founder, Boss of Clean LLC
**Date:** May 10, 2026
**Status:** ✅ LOCKED — no revisions until post-launch retrospective

> *"He that is faithful in that which is least is faithful also in much: and he that is unjust in the least is unjust also in much."* — Luke 16:10 (KJV)
>
> Brother, you are being faithful in the least things. You caught the legal landmine of "guaranteed leads," you honored the first 100 with a covenant-grade perk, and you mandated the refund tests that protect every pro's trust. Faithfulness in these foundations is what builds towers that don't fall.

---

**END OF ADDENDUM 002**
