# SECURITY DEFINER Execute Review — 2026-09-21

Scope: the nine functions reported by the live Supabase security advisor for
project `jisjxdsrflheosvodoxk`. Production was queried read-only. The companion
migration is prepared but was not applied.

| Function | Current browser roles | Internal authorization | Application dependency | Recommendation |
|---|---|---|---|---|
| `approve_cleaner(uuid)` | authenticated | `is_admin()` is the first guard | Admin server action | Keep authenticated; anon remains revoked |
| `check_quote_request_tier_limit(uuid)` | anon, authenticated | None; accepts any pro ID | No current call site found | Revoke anon and authenticated |
| `guard_pro_approval_status()` | anon, authenticated | Trigger transition rules | Database trigger only | Revoke direct browser execution |
| `is_admin()` | anon, authenticated | Uses `auth.uid()` and returns one boolean | Required by many RLS policies | Keep both roles |
| `is_cleaner()` | anon, authenticated | Uses `auth.uid()` and returns one boolean | Required by RLS policies | Keep both roles |
| `pro_response_time_stats(uuid[])` | anon, authenticated | Aggregate output only | Public professional response-time display | Keep both roles; document intentional public aggregate |
| `reject_cleaner(uuid,text)` | authenticated | `is_admin()` is the first guard | Admin server action | Keep authenticated; anon remains revoked |
| `request_cleaner_info(uuid,text)` | authenticated | `is_admin()` is the first guard | Admin server action | Keep authenticated; anon remains revoked |
| `verify_document(uuid,text,text)` | authenticated | `is_admin()` is the first guard | Admin server action | Keep authenticated; anon remains revoked |

## Reasoning

- The role helpers must remain callable by the roles whose RLS policies invoke
  them. Removing those grants would break legitimate table access.
- The three admin mutation functions and the document mutation function have a
  server-side admin check before data changes. Their authenticated grant is
  intentional because the current admin actions use the signed-in Supabase
  client.
- The response-time function exposes only grouped timing statistics used on
  public professional pages. It does not return messages or contact fields.
- The legacy tier helper has no repository call site and can reveal whether an
  arbitrary pro is below a monthly threshold. Browser access is unnecessary.
- The approval guard is a trigger function. Trigger execution does not require
  a browser role to hold direct `EXECUTE` permission.

## Acceptance checks for a database branch

1. Apply the migration to a Supabase database branch, never production first.
2. Run the security advisor again. The two corresponding warnings should be
   gone; the seven intentional warnings remain documented.
3. Exercise customer signup, pro profile writes, and admin approval/status
   actions to confirm the trigger and RLS helpers still operate.
4. Confirm direct RPC calls to the two narrowed functions fail for anon and
   authenticated roles and succeed for service-role server code.

## Rollback

The migration includes the exact grants needed to restore the prior browser
role access. Do not use the rollback unless an application dependency is found.
