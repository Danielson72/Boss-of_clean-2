# CLAUDE.md - Boss of Clean

## Project Overview

Boss of Clean (bossofclean.com) is a Florida cleaning services marketplace connecting customers with professional cleaners. The platform serves two user types: **customers** seeking cleaning services and **cleaners** offering their services.

## Tech Stack

- **Framework**: Next.js 13.5.1 with App Router
- **Language**: TypeScript 5.2.2
- **Database**: Supabase (PostgreSQL with Row Level Security)
- **Auth**: Supabase Auth
- **Payments**: Stripe (subscriptions, checkout, webhooks)
- **Styling**: Tailwind CSS with shadcn/ui components
- **Deployment**: Netlify

## Commands

```bash
npm run dev      # Start development server (port 3000)
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Run ESLint
npm test:e2e     # Run Playwright tests
```

## Project Structure

```
app/
├── api/                    # API routes
│   ├── cleaner/billing/    # Billing endpoints (GET, upgrade, cancel, reactivate)
│   └── stripe/             # Stripe checkout, portal, webhooks
├── dashboard/
│   ├── admin/              # Admin moderation queue
│   ├── cleaner/            # Cleaner dashboard
│   │   ├── billing/        # Subscription management
│   │   ├── leads/          # Available leads in service areas
│   │   ├── profile/        # Business profile editor
│   │   ├── quote-requests/ # Customer quote requests
│   │   ├── service-areas/  # ZIP code service areas
│   │   └── setup/          # Onboarding wizard
│   └── customer/           # Customer dashboard
├── search/                 # Search by service type and ZIP
└── quote-request/          # Customer quote submission

components/
├── billing/                # Subscription UI components
├── onboarding/             # Cleaner onboarding wizard
└── ui/                     # shadcn/ui primitives

lib/
├── auth/                   # Protected route wrapper
├── context/                # AuthContext provider
├── stripe/                 # Stripe utilities
└── supabase/               # Client and server Supabase clients

supabase/
├── complete-schema.sql     # Full database schema
└── *.sql                   # Incremental migrations
```

## Database Schema (Key Tables)

- `users` - All users with `role` (customer/cleaner/admin)
- `cleaners` - Cleaner business profiles (linked to users)
- `cleaner_service_areas` - ZIP codes served by cleaners
- `quote_requests` - Customer requests for quotes
- `lead_matches` - Leads matched to cleaners
- `reviews` - Customer reviews of cleaners
- `subscriptions` - Stripe subscription records

## Subscription Tiers

| Tier | Price | Lead Credits | Features |
|------|-------|--------------|----------|
| Free | $0 | 5/month | Basic listing, 1 photo |
| Basic | $79/month | 20/month | Priority search, unlimited photos |
| Pro | $199/month | Unlimited | Featured listing, analytics |

## Authentication

- Uses Supabase Auth with email/password
- Protected routes via `<ProtectedRoute requireRole="cleaner">` wrapper
- Middleware at `middleware.ts` handles auth redirects
- Auth context at `lib/context/AuthContext.tsx`

## Key Patterns

### API Routes
```typescript
// Always check auth first
const supabase = createServerClient();
const { data: { user } } = await supabase.auth.getUser();
if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
```

### Database Queries
```typescript
// Use Supabase client with proper joins
const { data, error } = await supabase
  .from('cleaners')
  .select(`*, user:users(full_name, email)`)
  .eq('user_id', user.id)
  .single();
```

### Protected Pages
```typescript
export default function CleanerPage() {
  return (
    <ProtectedRoute requireRole="cleaner">
      {/* page content */}
    </ProtectedRoute>
  );
}
```

## Environment Variables

Required in `.env`:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
```

## Common Issues

1. **Radix UI Progress** - Use custom `components/ui/progress.tsx` (Radix version has bundling issues)
2. **Database field names** - Check `supabase/complete-schema.sql` for exact column names
3. **Protected routes returning 307** - Expected behavior, redirects to login

## Git Workflow

- Main branch: `main`
- Remote: `git@github.com:Danielson72/Boss-of_clean-2.git`
- Commit style: `feat(scope):`, `fix(scope):`, `docs:`
