# Claude Code Prompt — Legacy Table Audit (Pre-Phase A2)

**For Claude Code CLI:** Read everything below the divider and execute it. This is a read-only diagnostic — no writes, no migrations, no schema changes.

---

## Task

Audit the existing legacy tables from the prior "fair lead model" build that overlap with the planned BOC Lead Engine v1.0 schema. The Phase A1 v1.1 migration was already applied successfully (additive only, no legacy modifications) on May 9, 2026. It revealed substantial overlap with legacy tables that we need to understand before planning Phase A2 (`lead_distributions`), A3 (`lead_declines`), and A4 (`lead_acceptances`).

Project: BOC Supabase `jisjxdsrflheosvodoxk`.

## Tables to Audit

These six tables are known to exist from prior work and may overlap with our v1.0 plans:

1. `public.subscriptions` — overlaps with `cleaners.subscription_*` columns
2. `public.leads` — may overlap with planned `lead_distributions`
3. `public.lead_unlocks` — may overlap with planned `lead_acceptances`
4. `public.lead_charges` — may overlap with `lead_acceptances` Stripe data
5. `public.lead_refund_requests` — may overlap with `refund_decisions` (just created in A1)
6. `public.pro_lead_credits` — may overlap with `cleaners.monthly_accepted_lead_count`


Plus two columns on `cleaners`:
- `cleaners.lead_credits_used`
- `cleaners.lead_credits_reset_at`

## Constraints

1. **Read-only.** No writes, no migrations, no schema changes. Just SELECT queries against `information_schema`, `pg_catalog`, and the tables themselves for sample data.
2. **Privacy-conscious.** When sampling row data, do NOT print full PII fields. Mask phone numbers, emails, and addresses. Print only what's needed to understand structure and usage patterns.
3. **No external network calls.** This is a database-only audit.
4. **No code modifications.** Pure read.

## What to Report (Per Table)

For each of the six tables, produce the following:

### Section A: Schema
- Full column list with types, nullability, defaults
- All check constraints
- All foreign key constraints (both directions — what does it reference, what references it)
- All indexes
- All RLS policies on the table (policy name, command, qualification expression)
- Comments on the table and columns if any exist

### Section B: Usage Patterns
- Total row count
- Created_at distribution (oldest row, newest row, rows in last 30 days, rows in last 7 days)
- Sample of 3 rows with PII masked


### Section C: Code References

Search the application code (the `app/`, `lib/`, `pages/`, and `supabase/` directories) for references to each table. Report:
- File paths that import or query this table
- Approximate count of references
- Categorize: API routes, hooks, components, edge functions, migrations

This tells us whether the table is **actively used** by production code or is **dormant**.

### Section D: Comparison to Planned v1.0 Schema

For each legacy table, compare its purpose against the v1.0 spec equivalent:

| Legacy Table | Planned v1.0 Equivalent | Likely Outcome |
|--------------|------------------------|----------------|
| `subscriptions` | Fields on `cleaners.subscription_*` | Adopt legacy as source of truth, OR migrate fields to cleaners |
| `leads` | `lead_distributions` | Adopt legacy with rename, OR supersede |
| `lead_unlocks` | `lead_acceptances` | Adopt legacy with rename, OR supersede |
| `lead_charges` | Fields in `lead_acceptances` | Probably fold into `lead_acceptances` |
| `lead_refund_requests` | `refund_decisions` (already created) | Migrate data from legacy if any exists, then deprecate |
| `pro_lead_credits` | `cleaners.monthly_accepted_lead_count` | Probably migrate forward and drop |

For each row in this table, give your recommendation based on what you find: **ADOPT**, **SUPERSEDE**, **MIGRATE-AND-DROP**, or **NEEDS-DISCUSSION**.


## Output Format

Structure your response as one Markdown document:

```markdown
# Legacy Table Audit — Pre-Phase A2

## Executive Summary
- Total legacy tables audited: 6
- Tables actively used by production code: [count]
- Tables dormant (no code references): [count]
- Tables with row data: [count]
- Total legacy rows across all tables: [count]

## Recommendations Summary
| Legacy Table | Row Count | Code Refs | Recommendation |
|--------------|-----------|-----------|----------------|
| subscriptions | X | Y | ADOPT/SUPERSEDE/etc |
| leads | X | Y | ... |
| lead_unlocks | X | Y | ... |
| lead_charges | X | Y | ... |
| lead_refund_requests | X | Y | ... |
| pro_lead_credits | X | Y | ... |

## Per-Table Detail

### Table 1: public.subscriptions
[Section A: Schema]
[Section B: Usage Patterns]
[Section C: Code References]
[Section D: Comparison and Recommendation]

### Table 2: public.leads
[same structure]

[...etc for all 6 tables]

## Bonus: cleaners.lead_credits_* Columns
- Current values distribution across cleaners table
- Code references
- Recommendation: MIGRATE-FORWARD to monthly_accepted_lead_count and drop, or KEEP-PARALLEL

## Open Questions for Daniel
[List any ambiguities or judgment calls you can't make from the audit alone]

## Next Steps
[What you recommend Daniel do with this report — typically: "review with Claude chat, decide adopt vs supersede strategy per table, then plan Phase A2 with that decision baked in"]
```


## Important Behavioral Notes

- **Don't suggest changes during the audit.** This prompt is "look at what exists." A separate prompt later will plan changes.
- **Do flag concerns prominently.** If a legacy table has 10,000 rows, that's important context. If a legacy table has zero rows but is referenced in 47 places in code, that's important context. Don't bury surprises.
- **If you find tables I didn't list that are clearly part of the legacy lead model**, include them in the report as "Additional Tables Discovered."
- **If the production application is currently running against any of these tables for live customer flows**, mark that as 🚨 RED FLAG so we know not to drop them casually.

## Auth Playbook Compliance

- Use the `(select auth.uid())` subquery pattern when reporting RLS policies — that's the project standard
- The `is_admin()` function is the canonical admin check — note when policies use it

When complete, post the full Markdown report. Stop. Wait for Daniel to bring it to Claude chat for analysis before any Phase A2 work begins.
