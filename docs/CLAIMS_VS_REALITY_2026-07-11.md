# What We Claim vs. What We Do — neutral-marketplace alignment (2026-07-11)

Confirmed model (Daniel): $30 flat lead fee; no % of jobs; BOC does not hold/process/pay out
service payment; BOC is not a party to the service contract; **no background checks, no
insurance/license verification, no guarantees**; doc-upload feature stays, only the claims change.

| We now CLAIM | What we actually DO | Match |
|---|---|---|
| "Independent / local / Florida pros" (was "vetted/verified") | List pros; no screening | ✅ |
| "Pros may upload license & insurance docs; where uploaded we display what was provided; we do NOT independently verify" | Doc-upload feature exists; no verification | ✅ |
| Profile badges: "Insurance doc on file" / "License doc on file" / "Boss of Clean Member" (were "Insured/Licensed/Certified") | DB flags are self-attested; docs self-uploaded | ✅ |
| Conspicuous profile disclaimer: "not independently verified… confirm directly with the pro" | True | ✅ |
| "$30 flat per lead" (was $25/$35/$45 tiered; $15 in config) | Charge amount lives in the Stripe price object | ⚠️ **Daniel must set the Stripe price to $30 by hand** (code refs env var `STRIPE_PRICE_BOC_PER_LEAD`; no $ hardcoded in the charge path) |
| "0% — we never take a cut of your job" | True | ✅ |
| "You pay your pro directly; we don't hold/process payment" | True | ✅ |
| No guarantee anywhere; /guarantee page deleted, 301 → /refund-policy | True | ✅ |
| David AI: "does NOT vet/verify/screen/background-check/certify/endorse; does not guarantee" | True | ✅ |

## Still open (flagged, not silently changed)
- **Stripe price object → $30** (dashboard, by hand). Nothing applied to Stripe.
- **TCPA/FTSA — pros get automated lead texts with NO consent captured.** Customer consent is compliant (separate unchecked checkbox + audit trail); pro phone collection (onboarding + setup) has no consent checkbox and no `tcpa_consent_*` write, yet the platform texts pros new-lead alerts. Compliant copy drafted in the PR; needs a form + DB change before SMS pro-notifications run in prod.
- **Terms not yet attorney-reviewed (DLD-276).** Hardened per Daniel (entity named, conspicuous caps disclaimer, class-action + jury waiver, $100 floor on liability cap, indemnity negligence carve-out) but counsel review still required.
- Icon-only green check badge on pro profile (no text) left as-is; `is_certified`/`insurance_verified` DB columns untouched (only visible claims changed).
