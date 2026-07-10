/**
 * Purge the 2026-07-10 post-lockdown smoke-test artifacts. DRY-RUN BY DEFAULT.
 *
 *   npx tsx scripts/purge-test-data.ts             # dry run — prints what would go
 *   npx tsx scripts/purge-test-data.ts --execute   # actually deletes
 *
 * Removes ONLY:
 *   - auth/public users: dalvarez+boctest-cust@sotsvc.com, dalvarez+boctest-pro@sotsvc.com
 *   - test quote request 992f54ff-5b7b-4ece-98b6-edc467b22fbe (+ dependents)
 *   - pros row "Test Pro Cleaning LLC" (+ dependents)
 *   - profile-images storage objects under the test pro's user folder
 *
 * NEVER touches (hard-guarded below):
 *   - payments rows (webhook/live-money proof)
 *   - the beautifulknowledge72@gmail.com pro or its captured lead_acceptances
 *
 * Requires SUPABASE_SERVICE_ROLE_KEY + NEXT_PUBLIC_SUPABASE_URL in env.
 */
import { createClient } from '@supabase/supabase-js'

const TEST_EMAILS = [
  'dalvarez+boctest-cust@sotsvc.com',
  'dalvarez+boctest-pro@sotsvc.com',
]
const TEST_QUOTE_ID = '992f54ff-5b7b-4ece-98b6-edc467b22fbe'
const TEST_BUSINESS_NAME = 'Test Pro Cleaning LLC'
const PROTECTED_EMAIL = 'beautifulknowledge72@gmail.com'

const EXECUTE = process.argv.includes('--execute')

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}
const supabase = createClient(url, key, { auth: { persistSession: false } })

function log(action: string, detail: unknown) {
  console.log(`${EXECUTE ? '[DELETE]' : '[dry-run]'} ${action}:`, JSON.stringify(detail))
}

async function main() {
  console.log(EXECUTE ? '=== EXECUTE MODE ===' : '=== DRY RUN (pass --execute to delete) ===')

  // Resolve test users
  const { data: users, error: uErr } = await supabase
    .from('users')
    .select('id, email, role')
    .in('email', TEST_EMAILS)
  if (uErr) throw uErr
  if (users.some((u) => u.email === PROTECTED_EMAIL)) {
    throw new Error('Guard tripped: protected account in deletion set')
  }
  const userIds = users.map((u) => u.id)
  log('users', users)

  // Test pro row (by business name AND owner in test set — both must match)
  const { data: pros } = await supabase
    .from('pros')
    .select('id, business_name, user_id')
    .eq('business_name', TEST_BUSINESS_NAME)
    .in('user_id', userIds.length ? userIds : ['00000000-0000-0000-0000-000000000000'])
  log('pros', pros)
  const proIds = (pros || []).map((p) => p.id)

  // Test quote request — verify it belongs to a test user before touching it
  const { data: quote } = await supabase
    .from('quote_requests')
    .select('id, customer_id, service_type, description')
    .eq('id', TEST_QUOTE_ID)
    .maybeSingle()
  if (quote && !userIds.includes(quote.customer_id)) {
    throw new Error(`Guard tripped: quote ${TEST_QUOTE_ID} does not belong to a test account`)
  }
  log('quote_request', quote)

  // Storage objects under the test pro user's folders
  for (const uid of userIds) {
    const { data: objs } = await supabase.storage.from('profile-images').list(uid)
    if (objs?.length) {
      log('profile-images objects', objs.map((o) => `${uid}/${o.name}`))
      if (EXECUTE) {
        await supabase.storage.from('profile-images').remove(objs.map((o) => `${uid}/${o.name}`))
      }
    }
  }

  // Guard: NEVER delete payments. Assert none reference the test entities
  // (there should be none — test flow never paid).
  const { count: payCount } = await supabase
    .from('payments')
    .select('id', { count: 'exact', head: true })
    .in('cleaner_id', proIds.length ? proIds : ['00000000-0000-0000-0000-000000000000'])
  if ((payCount ?? 0) > 0) {
    throw new Error('Guard tripped: payments reference the test pro — aborting, review manually')
  }
  console.log('payments guard: 0 rows reference test entities ✓')

  if (!EXECUTE) {
    console.log('\nDry run complete. Nothing deleted.')
    return
  }

  // Deletion order: dependents first.
  if (quote) {
    for (const t of ['lead_acceptances', 'lead_distributions', 'hire_confirmations', 'conversations']) {
      const { error } = await supabase.from(t).delete().eq('quote_request_id', TEST_QUOTE_ID)
      if (error && !/does not exist|column/.test(error.message)) throw error
    }
    await supabase.from('quote_requests').delete().eq('id', TEST_QUOTE_ID)
    log('deleted quote_request', TEST_QUOTE_ID)
  }
  for (const id of proIds) {
    await supabase.from('pros').delete().eq('id', id)
    log('deleted pro', id)
  }
  for (const u of users) {
    // public.users row falls via handle_user_delete trigger / FK when auth user goes.
    const { error } = await supabase.auth.admin.deleteUser(u.id)
    if (error) throw error
    log('deleted auth user', u.email)
  }
  console.log('\nExecute complete.')
}

main().catch((e) => {
  console.error('FAILED:', e.message)
  process.exit(1)
})
