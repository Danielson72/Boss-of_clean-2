# Ralph Agent Configuration

> Ralph Wiggum: "I'm helping!"

This document defines the standards, conventions, and guardrails for autonomous development on Boss of Clean.

---

## Brand Standards

### Company Identity
- **Name**: Boss of Clean
- **Domain**: bossofclean.com
- **Tagline**: "Purrfection is our Standard"
- **Market**: Florida cleaning services marketplace
- **Mascot**: Cat CEO (professional cat in business attire)

### Brand Voice
- Professional yet approachable
- Florida-focused (mention counties, local areas)
- Trust-building language (licensed, insured, verified)
- Action-oriented CTAs

### Visual Identity
- Primary colors: Blue (#2563eb), Green (#16a34a)
- Accent: Gold/Yellow for premium features
- Clean, modern UI with adequate whitespace
- Cat mascot appears in hero and key conversion points

---

## Tech Stack

### Core Framework
- **Next.js**: 13.5.1 (App Router)
- **React**: 18.2.0
- **TypeScript**: 5.2.2

### Backend & Database
- **Supabase**: PostgreSQL with Row Level Security
- **Auth**: Supabase Auth (email/password, OAuth planned)
- **Storage**: Supabase Storage for images

### Payments
- **Stripe**: Subscriptions, Checkout Sessions, Webhooks
- **Tiers**: Free ($0), Basic ($79), Pro ($199)

### Styling
- **Tailwind CSS**: 3.3.3
- **Components**: shadcn/ui (Radix primitives)
- **Icons**: lucide-react

### Deployment
- **Platform**: Netlify
- **CI/CD**: GitHub Actions (planned)

---

## Coding Conventions

### TypeScript
```typescript
// Always use explicit types for function parameters and returns
function calculatePrice(hours: number, rate: number): number {
  return hours * rate;
}

// Use interfaces for objects
interface CleanerProfile {
  id: string;
  business_name: string;
  hourly_rate: number;
}

// Prefer const assertions for constants
const SUBSCRIPTION_TIERS = ['free', 'basic', 'pro'] as const;
```

### React Components
```typescript
// Server Components by default (no 'use client' unless needed)
// Add 'use client' only for:
// - useState, useEffect, useContext
// - Event handlers (onClick, onChange)
// - Browser APIs

// File naming: PascalCase for components
// components/billing/SubscriptionCard.tsx

// Props interface naming: ComponentNameProps
interface SubscriptionCardProps {
  tier: string;
  price: number;
}
```

### Tailwind CSS
```typescript
// Use Tailwind classes directly, avoid @apply
// Group related classes logically:
// layout -> spacing -> typography -> colors -> effects

<div className="flex items-center gap-4 p-4 text-sm text-gray-600 bg-white rounded-lg shadow-sm">

// Use cn() utility for conditional classes
import { cn } from '@/lib/utils';
<div className={cn('p-4 rounded-lg', isActive && 'bg-blue-50 border-blue-200')}>
```

### File Organization
```
app/
├── (auth)/           # Route groups for layouts
├── api/              # API routes
│   └── [resource]/
│       └── route.ts  # GET, POST, PUT, DELETE handlers
└── dashboard/
    └── [role]/       # Role-specific dashboards

components/
├── ui/               # Primitives (button, input, card)
└── [feature]/        # Feature-specific components

lib/
├── supabase/
│   ├── client.ts     # Browser client
│   └── server.ts     # Server client
└── utils.ts          # Shared utilities
```

### Database Queries
```typescript
// Always handle errors
const { data, error } = await supabase
  .from('cleaners')
  .select('*')
  .eq('user_id', user.id)
  .single();

if (error) {
  console.error('Error fetching cleaner:', error);
  return null;
}

// Use proper joins for related data
const { data } = await supabase
  .from('quote_requests')
  .select(`
    *,
    customer:users!quote_requests_customer_id_fkey(
      full_name,
      email
    )
  `);
```

### API Routes
```typescript
// Standard pattern for API routes
import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ... handle request

  return NextResponse.json({ data });
}
```

---

## Safety Guardrails

### NEVER Do These (Hard Stops)

1. **Database Destruction**
   - NO `DROP TABLE`, `TRUNCATE`, `DELETE FROM table` (without WHERE)
   - NO schema changes without migration files
   - NO direct production database access

2. **Environment & Secrets**
   - NO modifying `.env` files
   - NO committing secrets or API keys
   - NO logging sensitive data (passwords, tokens)

3. **Git Operations**
   - NO `git push --force` to main
   - NO `git reset --hard` on shared branches
   - NO committing without running build first

4. **Destructive Code**
   - NO `rm -rf` without explicit path validation
   - NO infinite loops or recursive calls without limits
   - NO disabling security features (RLS, auth checks)

### Always Do These (Required)

1. **Before Committing**
   ```bash
   npm run build    # Must pass
   npm run lint     # Must pass
   ```

2. **Database Changes**
   - Create migration file in `supabase/`
   - Include rollback instructions in comments
   - Test with sample data first

3. **Authentication**
   - All dashboard routes must check auth
   - All API routes must validate user
   - Use `<ProtectedRoute>` wrapper for pages

4. **Error Handling**
   - All async operations need try/catch or error handling
   - User-friendly error messages (no stack traces in UI)
   - Log errors with context for debugging

### Commit Message Format
```
ralph: <type>(<scope>): <description>

Types: feat, fix, refactor, docs, test, chore
Scope: auth, billing, search, dashboard, api, ui

Example:
ralph: feat(billing): add subscription upgrade flow
ralph: fix(auth): resolve redirect loop on login
```

---

## Task Execution Protocol

1. **Read** the task requirements completely
2. **Plan** the implementation (identify files to modify)
3. **Implement** changes incrementally
4. **Test** with `npm run build && npm run lint`
5. **Commit** with proper message format
6. **Report** completion status and any blockers

### When Stuck
- Document the blocker clearly
- Do NOT proceed with uncertain changes
- Mark task as blocked in report
- Move to next task if possible
