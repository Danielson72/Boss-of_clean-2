# Boss of Clean — Consent Architecture (Quote Form + Communications)

> **DRAFT — FOR ATTORNEY REVIEW (DLD-276).** This document is a working draft
> prepared to speed up counsel review. It is not legal advice and is not in
> force until approved and published.

**Purpose:** define exactly what a customer agrees to when they submit a
quote request, and the TCPA-aware wording for phone/SMS consent, so the
consent shown in the UI, the consent stored in the database, and the
platform's actual data flow all match.

---

## 1. How contact info actually flows (the thing consent must describe)

1. Customer submits a quote request. Pros see a **redacted** lead only:
   first name, city/ZIP, and job details — no phone, email, or street
   address.
2. Customer receives quotes, accepts one, and **confirms the hire**.
3. The chosen Pro pays the lead fee. **Only then** is the customer's contact
   information (name, phone, email, service address) released — and only to
   that one paying Pro.

Consent language must promise exactly this and nothing broader.

## 2. Quote form consent language (draft copy)

Displayed at the point of submission, adjacent to the submit button:

> By submitting this request, you agree to Boss of Clean's Terms of Service
> and Privacy Policy. Your contact details stay private while you collect
> quotes. **If you accept a quote and confirm your hire, we share your name,
> phone number, email, and service address with that one professional** so
> they can complete your job. We never sell your information.

Implementation requirements (already supported by the platform's consent
audit fields):
- Store the exact consent text shown, a version identifier, the source URL,
  a server-side timestamp, and the submitter's IP / user agent.
- Any wording change increments the version; historical submissions keep the
  version they actually saw.

## 3. TCPA-aware phone/SMS consent (for future SMS features)

SMS/auto-texting is **off by default**. When enabled, it requires its own
**separate, unchecked checkbox** — never bundled into the general consent
above, and never a condition of getting quotes.

Draft checkbox copy:

> ☐ Yes — Boss of Clean and the professional I hire may text me at the
> number provided about my service request (for example: quotes, scheduling,
> and arrival updates). Message and data rates may apply. Message frequency
> varies. Reply STOP to opt out, HELP for help. Consent is not a condition
> of purchase. See our Privacy Policy and SMS Terms.

Requirements:
- Capture the same audit trail as §2 (verbatim text, version, timestamp, IP,
  user agent) for the SMS checkbox specifically.
- Every outbound SMS includes STOP/HELP handling; opt-outs are honored
  immediately and suppress all future non-transactional texts.
- Quiet hours and per-recipient frequency caps are enforced platform-side.
- *Counsel note:* confirm prior-express-written-consent sufficiency under
  the TCPA (47 U.S.C. § 227) and the FCC's one-to-one consent rulemaking
  status, plus the Florida Telephone Solicitation Act (Fla. Stat. § 501.059)
  timing and consent rules, which are stricter than federal in places.

## 4. Email + phone use without SMS consent

Without the SMS checkbox, the platform and the paying Pro may still contact
the customer by **email and live voice call** about the specific request
(transactional/service context). Marketing email requires its own opt-in and
a working unsubscribe (CAN-SPAM).

## 5. Data-sharing boundaries (consent ceiling)

- Contact info is shared with **one** Pro per hire — never broadcast to
  multiple Pros, never included in pre-payment lead previews.
- No sale of personal information; no sharing with unrelated third parties
  except processors (hosting, payments, email/SMS delivery) under contract.
- Customers may request deletion of their account data (Privacy Policy
  governs process and any retention required for payments/disputes).

---

*DRAFT — FOR ATTORNEY REVIEW (DLD-276). Not final. Not legal advice.*
