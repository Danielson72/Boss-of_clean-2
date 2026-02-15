# CLAUDE.md — Boss of Clean Constitution (Ralph Wiggum v1.1)

## 🎯 PROJECT IDENTITY

**Project:** Boss of Clean - Florida's Premier Cleaning Services Marketplace
**Tagline:** "Purrfection is our Standard"
**Mascot:** CEO Cat (orange cat in business suit with sunglasses)
**Domain:** bossofclean.com
**Target Market:** Florida (Miami-Dade, Broward, Palm Beach counties initially)

### What We're Building
A two-sided marketplace connecting customers who need cleaning services with verified cleaning professionals. We disrupt predatory lead-gen platforms (HomeAdvisor, Thumbtack, Angi) by offering fair, transparent pricing and quality guarantees.

### Current State
- **Users:** 93 registered (53 customers, 39 cleaners, 1 admin)
- **Approved Cleaners:** 30
- **Quote Requests:** 17
- **Reviews:** 8
- **Status:** MVP functional, needs polish and feature completion

---

## 🛠️ TECH STACK

| Layer | Technology |
|-------|------------|
| Framework | Next.js 13.5.1 (App Router) |
| Database | Supabase (PostgreSQL + Auth + Storage) |
| Payments | Stripe |
| Styling | Tailwind CSS |
| Deployment | Netlify |
| Node Version | v20 (required) |
| Dev Port | localhost:3007 |

---

## 🚨 BRAND SAFETY — CRITICAL

### Boss of Clean Identity
- **Tagline:** "Purrfection is our Standard"
- **Tone:** Professional, trustworthy, premium
- **Mascot:** CEO Cat with glasses and suit

### NEVER Confuse With Other Brands
Daniel owns multiple businesses. These are SEPARATE:

| Brand | Tagline | Domain |
|-------|---------|--------|
| **Boss of Clean** | "Purrfection is our Standard" | bossofclean.com |
| Sonz of Thunder Services | "YOU'RE CLEAN OR YOU'RE DIRTY" | sotsvc.com |
| TrustedCleaningExpert | (informational) | trustedcleaningexpert.com |
| DLD-Online | (personal) | dld-online.com |

**RULE:** Never mix branding. Never import from other projects. Never reference other taglines.

---

## 🗄️ DATABASE SCHEMA (Reference)

### Core Tables
```
profiles          - User profiles (extends Supabase auth.users)
professionals     - Cleaning service providers
services          - Service offerings by professionals
quote_requests    - Customer requests for quotes
quotes            - Professional responses to requests
bookings          - Confirmed appointments
reviews           - Customer reviews of completed services
```

### Booking Status State Machine
```
┌─────────┐    Provider    ┌───────────┐    Marks Done    ┌───────────┐
│ pending │───────────────▶│ confirmed │────────────────▶│ completed │
└─────────┘    Accepts     └───────────┘                  └───────────┘
     │                           │
     │      Either Party         │
     └───────────┬───────────────┘
                 │ Cancels
                 ▼
           ┌───────────┐
           │ cancelled │
           └───────────┘
```

---

## 🔒 AUTONOMY HARDENING (MUST FOLLOW)

### Sabbath Mode (Owner Rest Window)
- **Do NOT** request approvals, ping Daniel, or generate "action needed" notifications between **Friday sunset and Saturday sunset** (America/New_York timezone).
- You **MAY** continue offline work during Sabbath Mode:
  - Audits, refactors, UI polish, documentation
  - Anything that doesn't require human approval
- Check sunset times for Orlando, FL if uncertain.

### Supabase Environment Safety
- Treat **production Supabase as READ-ONLY** during autonomous runs.
- Do NOT write, seed, or change data in production.
- If a separate dev/staging Supabase project exists, use that for write testing.
- If no dev/staging exists, produce SQL/migrations as **proposals only**.
- Project ID reference: `jisjxdsrflheosvodoxk` (PRODUCTION - READ ONLY)

### Testing Framework Clarity
- Do NOT install Jest, Vitest, Playwright, or any new test framework without approval.
- If a test framework already exists in the project, run it.
- If no test framework exists, the **minimum quality gate** is:
  - `npm run build` must pass
  - `npm run lint` must pass (if available)
  - No TypeScript errors

### PII Protection (Florida FIPA Compliance)
- Do NOT include customer/provider PII in reports, logs, or commits:
  - No emails, phone numbers, addresses, message contents
- In reports, refer to `user_id` or anonymized identifiers only.
- Customer contact info should be hidden until booking status is `confirmed`.

### UI Consistency Rule
- **Reuse existing components and patterns first.**
- Do NOT invent a new design system.
- Check `/components/ui` for existing patterns before creating new ones.
- If shadcn/ui exists in the project, use it consistently.
- If not, use Tailwind CSS + HeadlessUI only.

### Next.js 13 Server/Client Protocol
- **Default to Server Components.**
- Use `'use client'` only for interactivity (hooks, state, event handlers).
- Keep client components as the **smallest possible leaf node**.
- Never make an entire page a client component unless absolutely necessary.

### Branding Leak Check (Before Every Commit)
Before EVERY commit, run a repo-wide search to ensure **NONE of these exist**:
```bash
grep -r "SOTSVC" --include="*.tsx" --include="*.ts" --include="*.md"
grep -r "YOU'RE CLEAN OR YOU'RE DIRTY" --include="*.tsx" --include="*.ts"
grep -r "sotsvc.com" --include="*.tsx" --include="*.ts"
grep -r "trustedcleaningexpert.com" --include="*.tsx" --include="*.ts"
```
If any matches found: **STOP and remove them before committing.**

### Route Safety Rule
- Do NOT rename or move anything under `/app` without approval.
- Do NOT rename route groups like `(dashboard)` or `(auth)` without approval.
- Route changes can silently break Next.js App Router.

### Stripe Lockdown (Revenue Safety)
- Do NOT modify these without approval:
  - Product IDs
  - Price IDs
  - Checkout modes
  - Webhook handlers (`/api/webhooks/stripe`)
- UI-only improvements that don't change payment behavior are allowed.

### Auth Task Split Rule
- Auth **AUDIT + PROPOSAL** is autonomous (identify problems, propose solutions).
- Auth **IMPLEMENTATION** requires Daniel's approval before execution.

### RLS Verification Rule
- Any new table created must have a corresponding `.sql` migration file.
- RLS policies must **default to 'deny' for all** until explicitly granted.
- Verify RLS is enabled on tables that store user data.

---

## ✅ DEFINITION OF DONE

A task is **DONE** only when ALL of these are true:

### Build / Quality
- [ ] `npm run build` passes with zero errors
- [ ] No TypeScript errors
- [ ] No debug `console.log()` statements left behind
- [ ] No `// TODO` or `// FIXME` without ticket reference

### UX Standards
- [ ] Mobile-first: works at 375px width minimum
- [ ] Has loading states where data is fetched
- [ ] Has empty states where lists could be empty
- [ ] Has error states for failed operations

### Security / Data
- [ ] No secrets logged or committed
- [ ] No PII included in reports or logs
- [ ] Supabase access patterns respect RLS
- [ ] Auth checks on protected routes

### Git Hygiene
- [ ] Work done on feature branch (never main)
- [ ] Descriptive commit messages (conventional commits)
- [ ] Task status updated in `ralph-tasks.md`
- [ ] Branding leak check passed

### Verification Loop
Before marking any task complete:
1. Run `npm run build`
2. Create a brief "Test Plan" note describing how the feature was verified
   - Example: "Logged in as test_provider@example.com, successfully viewed dashboard"
3. Update task status with completion notes

---

## 📁 PROJECT STRUCTURE (Expected)

```
boss-of-clean/
├── app/
│   ├── (auth)/           # Auth routes (login, signup, etc.)
│   ├── (dashboard)/      # Protected dashboard routes
│   ├── (public)/         # Public marketing pages
│   ├── api/              # API routes
│   ├── providers/
│   │   └── [slug]/       # SEO-friendly provider profiles
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── ui/               # Reusable UI components
│   └── ...
├── lib/
│   ├── supabase/         # Supabase client config
│   └── stripe/           # Stripe config
├── public/
├── ralph/                # Ralph system files
│   ├── CLAUDE.md
│   ├── ralph-tasks.md
│   ├── ralph-guardrails.md
│   └── ...
└── package.json
```

---

## 🔄 WORKFLOW PROTOCOL

### Starting a Task
1. Read the task from `ralph-tasks.md`
2. Understand scope and acceptance criteria
3. Create feature branch: `git checkout -b [branch-name]`
4. Analyze existing code related to the task
5. Plan your approach before writing code

### During Development
- Make small, focused commits
- Use descriptive commit messages (conventional commits)
- Test frequently with `npm run build`
- Fix errors immediately - don't accumulate tech debt
- Document any decisions or discoveries

### Completing a Task
1. Run full build: `npm run build`
2. Run branding leak check (grep commands above)
3. Test the feature manually
4. Commit final changes
5. Update task status in `ralph-tasks.md`
6. Write completion summary
7. Leave for Daniel to review and merge

### If Stuck (15-Minute Rule)
If stuck for more than 15 minutes:
1. Document the blocker in `ralph-blockers.log`:
   - Task ID
   - What you tried
   - Error messages
   - Your hypothesis for the cause
2. Move to the next task
3. Flag for Daniel's review

---

## 📝 COMMIT MESSAGE FORMAT

Use conventional commits:
```
type(scope): description

[optional body]

[optional footer]
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `refactor`: Code change that neither fixes a bug nor adds a feature
- `style`: Formatting, missing semicolons, etc.
- `docs`: Documentation only
- `chore`: Maintenance tasks
- `test`: Adding or updating tests

Examples:
```
feat(search): add provider search by location
fix(auth): resolve redirect loop after login
refactor(dashboard): extract stats card component
docs(readme): update setup instructions
chore(deps): update Next.js to 13.5.1
```

---

## 🚀 QUICK REFERENCE

### Essential Commands
```bash
nvm use 20                    # Ensure correct Node version
npm run dev                   # Start dev server (port 3007)
npm run build                 # Production build (quality gate)
npm run lint                  # Run linter (if configured)
```

### Git Commands
```bash
git checkout -b feature/name  # Create feature branch
git add .                     # Stage changes
git commit -m "type: desc"    # Commit with message
git push origin feature/name  # Push to remote
```

### Key URLs
- Dev: http://localhost:3007
- Production: https://bossofclean.com
- Supabase Dashboard: https://supabase.com/dashboard/project/jisjxdsrflheosvodoxk

---

*Last Updated: January 2025 | Ralph Wiggum v1.1*


---

## 🔗 CROSS-PROJECT GOVERNANCE (v2 Additions)

> See `CROSS-PROJECT-TRACKS.md` for shared system rules (Stripe, Supabase, Lead Engine).

### Feature Tracks (Boss of Clean specific)

**Marketplace Track:**
- D1: Provider onboarding (registration, profile, verification)
- D2: Provider directory + search (SEO-focused)
- D3: Quote request / job request flow
- D4: Lead purchase / payment logic
- D5: Messaging + notifications

**Stripe Track (shared governance — separate from SOTSVC):**
- A1: Products/prices registry (marketplace-specific)
- A2: Checkout/session creation
- A3: Webhook handler + retries + idempotency
- A4: Provider payout logic (Stripe Connect if applicable)

**Supabase Track:**
- B1: Schema migrations (per feature)
- B2: RLS policies (non-negotiable)
- B3: Multi-tenant data isolation (providers see only their data)

### Enhanced Session Protocol (Interrogation Requirement)

Before writing ANY code in a new session:
1. Read this CLAUDE.md (all sections including Ralph guardrails)
2. **Ask 7-12 clarifying questions** to remove ambiguity
3. **List at least 5 edge cases** you foresee
4. **Show evidence from repo** (file paths + code snippets) before modifying
5. Propose approach + exact file touch list — **WAIT for approval**
6. At ~40-50% context window, tell Daniel so you can start fresh

### Session Restart Triggers

Restart immediately when you observe:
- Claude repeats earlier plans or summaries
- "We should create a new…" for something that already exists
- Variable names change from what was already defined
- Claude forgets brand separation (mentions SOTSVC in Boss of Clean context)
- Claude proposes schema changes without reading existing migrations
- Claude says "as we discussed" about something not discussed this session

### Agent System (from Context Engineering sessions)

Boss of Clean has 8 specialized agents defined in our previous work:
- **Foundation Agent** — site architecture, tech stack, core structure
- **Authority Agent** — brand positioning, expert content, testimonials
- **Conversion Agent** — lead gen, GoHighLevel funnels, Stripe subscriptions
- **Local SEO Agent** — "cleaning services near me", GMB, citations
- **Revenue Agent** — service packages, pricing psychology, upsells
- **Visual Agent** — CEO Cat integration, brand consistency, mobile-first
- **Trust Agent** — licensing, insurance badges, guarantees, privacy
- **Boss Persona Agent** — CEO Cat character, brand voice, cat-themed messaging

Activate any agent by including its prompt at session start alongside this CLAUDE.md.

---

> *"Whatever you do, work at it with all your heart, as working for the Lord."* — Colossians 3:23
