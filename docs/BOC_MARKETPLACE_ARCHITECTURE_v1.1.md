# Boss of Clean — Marketplace Architecture v1.1

**Status:** Authoritative target state for Phase A
**Authored:** 2026-05-20 (DLD-510 / A2), derived from the DLD-413 read-only audit
**Owner:** CTO + Board (Daniel)

This is the single source of truth for the Boss of Clean marketplace pivot.
Every Phase A ticket (A3–A9 = DLD-511 … DLD-517) must reference this document.
If an implementation detail conflicts with this spec, the spec wins — or the
spec gets amended first in a PR, then the code follows.

---

## 1. Why we're changing

The pre-v1.1 marketplace let pros see customer contact info (name, email,
phone) **before** paying for the lead, and let customers and pros exchange
free-text chat messages. Two problems:

1. **Lead-bypass leak.** A pro could read the customer's email/phone from the
   quote or via free-text chat, then contact them off-platform and never pay
   the lead fee. The `quote_requests.contact_name/email/phone` columns and the
   legacy `app/dashboard/pro/leads/` flow are the leak surface.
2. **Compliance + trust.** Free-text chat is hard to moderate (PII leaks,
   abuse) and Twilio/TCPA exposure grows with unstructured outbound messaging.

v1.1 closes both with two pillars:

- **Pay-on-Acceptance** — a pro only sees customer PII after they pay to unlock
  the lead. Until then, they see a redacted view (first name + city/zip + job
  details only).
- **Structured-forms-only communication** — no free-text chat. Customers send
  structured follow-ups (confirm date, add photo, ask scoped question); pros
  send structured responses (price, availability, notes). A PII scrubber is the
  defense-in-depth net on any free-text field that remains (e.g. job
  description).

---

## 2. Data model

### `quote_requests` (the lead)

- Identity: `id`, `customer_id` (FK → users), `cleaner_id` (FK → pros, NULL =
  unclaimed marketplace lead).
- Job: `service_type`, `service_date?`, `service_time?`, `duration_hours?`,
  `address?`, `city`, `zip_code`, `description?`, `property_type?`,
  `property_size?`, `frequency?`.
- Status flow: `pending → responded → accepted → completed | cancelled`.
- TCPA: `tcpa_consent_at`, `tcpa_consent_ip`, `tcpa_consent_ua`.
- **REMOVED in v1.1 (A4 / DLD-512):** `contact_name`, `contact_email`,
  `contact_phone`. Customer identity is resolved at read-time via the
  `customer_id` FK, never denormalized onto the lead.

### Customer identity exposure rules

| Lead state | What the pro sees |
|---|---|
| `pending` (unclaimed) | First name, city, zip, job details. **No email/phone/last name.** |
| `responded` (pro quoted, not yet paid) | Same redacted view. |
| Lead **unlocked** (pro paid) OR `accepted` | Full contact info (name, email, phone) via the customer JOIN. |

Enforced by the **`quote_requests_pro_view` security-barrier view** (A5 /
DLD-513): pros read leads through the view, which only ever exposes redacted
columns. Full contact info comes from a separate, unlock-gated path.

### `conversations` + `messages`

- `conversations`: `id`, `customer_id`, `cleaner_id`, `quote_request_id?`,
  `*_unread_count`, timestamps. Stays.
- `messages`: gains a `kind` discriminator and a structured `payload` (jsonb)
  in A6 (DLD-514). Free-text `content` remains only for scrubber-gated fields.

### `lead_unlocks`

- Records a pro's paid unlock of a specific `quote_request_id`. The Stripe
  Pay-on-Acceptance flow (A9 / DLD-517) writes a `paid` row here, which is what
  flips the PII reveal for that pro on that lead.

---

## 3. Communication model (structured-only)

No free-text chat. Two structured message families:

**Customer → Pro** (`quote_request_followup`):
- Confirm / change preferred date
- Add a photo
- Ask a scoped question (picklist of common questions + a short scrubbed note)

**Pro → Customer** (`quote_response`):
- Price
- Availability window
- Scope notes (scrubbed)

The PII scrubber (A6 / DLD-514) runs on any free-text sub-field. It is a
rolling-window scrubber: it concatenates a sender's recent messages in a
conversation and re-applies PII patterns to catch values split across multiple
messages (the sequential-splitting bypass). Customers are always scrubbed;
pros are scrubbed until they've paid to unlock that lead.

---

## 4. Pay-on-Acceptance flow (A9 / DLD-517)

1. Customer posts a quote request (lead enters `pending`).
2. Matched pros see the **redacted** lead.
3. A pro responds with a structured quote (`responded`).
4. To contact the customer directly / accept the job, the pro pays the lead fee
   → Stripe Checkout → on success, a `paid` row in `lead_unlocks`.
5. PII reveals to that pro for that lead; conversation un-gates for them.
6. Customer accepts a pro's quote → `accepted`, booking created.

**Stripe is currently on hold** per `AGENTS.md` (Daniel provisioning the BOC
LLC bank account). A9 implementation should be code-complete and behind a
flag, but the live keys / dashboard products are a Board action (see DLD-518).

---

## 5. Phase A execution order (dependency chain)

Each step depends on the previous. Do not parallelize across the arrows.

```
A2  DLD-510  commit this spec                       (docs only) ← you are here
A3  DLD-511  delete legacy app/dashboard/pro/leads/ (live PII leak)
A4  DLD-512  migration: NULL + drop contact_* cols  (needs A3 — no readers left)
A5  DLD-513  quote_requests_pro_view barrier view   (needs A4)
A6  DLD-514  structured message schema + scrubber   (needs A5)
A7  DLD-515  customer structured-input UI           (needs A6)
A8  DLD-516  pro structured-response UI             (needs A7)
A9  DLD-517  Pay-on-Acceptance Stripe flow          (needs A8; Stripe on hold)
```

Parallel / Board-side:
- **DLD-518** (MANUAL) — update Stripe Dashboard product descriptions to remove
  lead-count promises. Daniel-only.
- **DLD-519 / DLD-520** — pro + customer dashboard brand restyle / mobile fixes.
  Independent of the data-model chain; can land anytime.

---

## 6. Non-goals for v1.1

- Real-time chat / websockets beyond the existing unread-count polling.
- In-app payments to pros (we charge pros for leads, not process customer→pro
  job payments yet).
- Multi-pro group threads. One customer ↔ one pro per conversation.

---

## 7. Acceptance for "Phase A complete"

- Zero customer PII (`email`, `phone`, full name) reachable by a pro who has
  not paid to unlock that specific lead — verified by RLS + view + a negative
  test.
- `quote_requests.contact_*` columns dropped; no code references them.
- Customer and pro dashboards use structured inputs; free-text chat removed
  from the primary path.
- Pay-on-Acceptance flow code-complete behind a flag, ready to enable when
  Stripe goes live.
