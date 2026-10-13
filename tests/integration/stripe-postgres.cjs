// Real PostgreSQL only in a newly initialized private BOC fixture cluster.
// Run: node tests/integration/stripe-postgres.cjs /tmp/boc-local-pg-context.json
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { Client } = require('pg');
const config = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
assert.match(config.root, /^\/tmp\/boc-pg-isolated-[a-zA-Z0-9_]+$/);
assert.equal(config.socket, `${config.root}/socket`);
assert.equal(config.database, 'boc_fixture_only');
assert.equal(config.user, 'boc_fixture_owner');
const clients = [];
let owner, a, b;
const pro = randomUUID(), quote = randomUUID(), acceptance = randomUUID();
async function connection(role = null) {
  const c = new Client({ host: config.socket, port: config.port, database: config.database, user: config.user });
  await c.connect(); clients.push(c);
  const result = (await c.query("SELECT current_setting('data_directory') AS directory, current_setting('listen_addresses') AS tcp, current_database() AS db")).rows[0];
  assert.equal(result.directory, `${config.root}/data`); assert.equal(result.tcp, ''); assert.equal(result.db, config.database);
  if (role) { assert.ok(['service_role','boc_anon'].includes(role)); await c.query(`SET ROLE ${role}`); }
  return c;
}
before(async () => {
  owner = await connection();
  assert.equal(Number((await owner.query("SELECT count(*) FROM pg_tables WHERE schemaname='public'")).rows[0].count), 0, 'fixture database must be empty before any writes');
  await owner.query(`
    DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN CREATE ROLE service_role NOLOGIN BYPASSRLS; END IF; IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='boc_anon') THEN CREATE ROLE boc_anon NOLOGIN; END IF; END $$;
    ALTER DEFAULT PRIVILEGES REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
    CREATE TYPE public.subscription_tier AS ENUM ('free','basic','pro');
    CREATE TYPE public.payment_status AS ENUM ('pending','succeeded','failed','refunded');
    CREATE TABLE public.pros (id uuid PRIMARY KEY, user_id uuid, subscription_tier public.subscription_tier DEFAULT 'free', subscription_expires_at timestamptz,
      stripe_subscription_id text, next_billing_date timestamptz, payment_failed_count integer DEFAULT 2, grace_period_end timestamptz,
      monthly_accepted_lead_count integer DEFAULT 7, last_payment_date timestamptz);
    CREATE TABLE public.quote_requests(id uuid PRIMARY KEY);
    CREATE TABLE public.subscriptions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), cleaner_id uuid NOT NULL REFERENCES public.pros,
      stripe_subscription_id text UNIQUE, stripe_customer_id text, tier public.subscription_tier NOT NULL, status text,
      current_period_start timestamptz, current_period_end timestamptz, cancel_at timestamptz, monthly_price numeric(10,2), features jsonb);
    CREATE TABLE public.payments (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), cleaner_id uuid NOT NULL REFERENCES public.pros,
      stripe_payment_intent_id text UNIQUE, amount numeric(10,2) NOT NULL, currency text, status public.payment_status,
      description text, metadata jsonb, paid_at timestamptz);
    CREATE TABLE public.lead_acceptances (id uuid PRIMARY KEY, quote_request_id uuid NOT NULL REFERENCES public.quote_requests,
      cleaner_id uuid NOT NULL REFERENCES public.pros, amount_cents integer NOT NULL, stripe_checkout_session_id text,
      stripe_payment_intent_id text, status text CHECK(status IN ('pending','authorized','captured','voided','refunded')),
      unlocked_at timestamptz, captured_at timestamptz, UNIQUE(quote_request_id,cleaner_id));
    CREATE TABLE public.stripe_webhook_events(id uuid PRIMARY KEY DEFAULT gen_random_uuid(), event_id varchar(255) UNIQUE NOT NULL,
      event_type varchar(100) NOT NULL, status varchar(20) CHECK(status IN ('pending','processing','processed','failed')),
      processed_at timestamptz, error_message text, retry_count integer DEFAULT 0, last_retry_at timestamptz,
      payload jsonb, customer_id text, subscription_id text, invoice_id text, created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now());
    CREATE TABLE public.notification_logs (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), event_id uuid NOT NULL UNIQUE,
      event_type text NOT NULL, quote_request_id uuid REFERENCES public.quote_requests, recipient_id uuid NOT NULL,
      recipient_role text CHECK(recipient_role IN ('cleaner','customer','admin')), recipient_channel text CHECK(recipient_channel IN ('sms','email')),
      recipient_address text NOT NULL, dedupe_hash text NOT NULL, bucket_window_iso timestamptz NOT NULL, provider text CHECK(provider IN ('twilio','resend')),
      provider_message_id text, provider_response_raw jsonb, delivery_state text CHECK(delivery_state IN ('queued','dispatched','accepted','delivered','failed','bounced','unsubscribed','rate_limited','quiet_hours','duplicate')),
      retry_count integer NOT NULL DEFAULT 0, last_retry_at timestamptz, next_retry_at timestamptz, created_at timestamptz DEFAULT now(),
      dispatched_at timestamptz, delivered_at timestamptz, failed_at timestamptz);
    ALTER TABLE public.pros ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.lead_acceptances ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.stripe_webhook_events ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;
    GRANT USAGE ON SCHEMA public TO service_role,boc_anon;
    GRANT SELECT,INSERT,UPDATE,DELETE ON ALL TABLES IN SCHEMA public TO service_role;
  `);
  const migration = fs.readFileSync(path.resolve('supabase/migrations/20260921014926_atomic_stripe_webhook_claim.sql'), 'utf8');
  await owner.query(migration);
  await owner.query(migration); // proposal is reapplicable on the fixture schema
  a = await connection('service_role'); b = await connection('service_role');
  await assert.rejects(a.query('SELECT * FROM public.claim_stripe_webhook_event($1,$2,$3)',[randomUUID(),'evt_permission','invoice.paid']), /permission denied/);
  // Test-only grants, never production. Explicitly demonstrates release prerequisite.
  await owner.query('GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role');
  await owner.query('INSERT INTO public.pros(id,user_id) VALUES($1,$2)',[pro,randomUUID()]);
  await owner.query('INSERT INTO public.quote_requests(id) VALUES($1)',[quote]);
  await owner.query("INSERT INTO public.lead_acceptances(id,quote_request_id,cleaner_id,amount_cents,stripe_checkout_session_id,status) VALUES($1,$2,$3,3000,'cs_fixture','pending')",[acceptance,quote,pro]);
});
after(async () => { await Promise.all(clients.map(c => c.end())); });
async function claim(c, id, type='invoice.paid', created=100, sub='sub_fixture') {
  const token=randomUUID();
  const payload={id,type,created,data:{object:{id:sub,mode:'payment',metadata:{type:'lead_unlock',venture:'boc'}}}};
  const row=(await c.query('SELECT * FROM public.claim_stripe_webhook_event($1,$2,$3,$4)',[token,id,type,payload])).rows[0];
  return {id,token:row.claim_token,...row};
}
async function finish(c, q, error=null) { await c.query('SELECT public.finish_stripe_webhook_event($1,$2,$3)',[q.id,q.token,error]); }
async function reserve(c,q,sub='sub_fixture') { const token=randomUUID();await c.query('SELECT public.begin_stripe_subscription_sync($1,$2,$3,$4)',[q.id,q.token,sub,token]);return token; }
function snapshot(sub='sub_fixture',created=50,status='active') {return {cleaner_id:pro,stripe_subscription_id:sub,stripe_customer_id:'cus_fixture',stripe_created:created,tier:'basic',status,current_period_start:'2026-10-01T00:00:00Z',current_period_end:'2026-11-01T00:00:00Z',monthly_price:79,features:[]};}
async function sync(c,q,data=snapshot(),token=null) {token ||= await reserve(c,q,data.stripe_subscription_id);return (await c.query('SELECT public.sync_stripe_subscription($1,$2,$3,$4) AS applied',[q.id,q.token,token,data])).rows[0].applied;}
async function invoice(c,q,id='in_fixture') {return (await c.query('SELECT public.fulfill_stripe_paid_invoice($1,$2,$3,$4,$5,$6,$7) AS applied',[q.id,q.token,'sub_fixture',id,null,3000,'usd'])).rows[0].applied;}
async function lead(c,q) {return (await c.query('SELECT public.fulfill_stripe_lead_unlock($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) AS applied',[q.id,q.token,'cs_fixture',quote,pro,acceptance,'pi_fixture',3000,'Fixture city','fixture'])).rows[0].applied;}

test('real simultaneous event claims have exactly one owner',async()=>{
  const qs=await Promise.all([claim(a,'evt_race'),claim(b,'evt_race')]);assert.equal(qs.filter(q=>q.is_new).length,1);
});
test('real stale claim recovery fences both completion and fulfillment',async()=>{
  const old=await claim(a,'evt_recover');await owner.query("UPDATE public.stripe_webhook_events SET updated_at=now()-interval '6 minutes' WHERE event_id=$1",[old.id]);
  const fresh=await claim(b,old.id);assert.equal(fresh.is_new,true);assert.notEqual(old.token,fresh.token);
  await assert.rejects(finish(a,old),/claim lost/);await assert.rejects(finish(a,old,'old failure'),/claim lost/);await assert.rejects(invoice(a,old),/claim lost/);
  await finish(b,fresh);
});
test('crashed subscription-created claim recovers atomically and unblocks owned invoice',async()=>{
  const paid=await claim(a,'evt_paid_before');await assert.rejects(invoice(a,paid),/Subscription not available/);
  const old=await claim(a,'evt_sub_create','customer.subscription.created');await owner.query("UPDATE public.stripe_webhook_events SET updated_at=now()-interval '6 minutes' WHERE event_id=$1",[old.id]);
  const fresh=await claim(b,old.id,'customer.subscription.created');await sync(b,fresh);await finish(b,fresh);
  assert.equal((await a.query('SELECT stripe_subscription_id FROM public.pros WHERE id=$1',[pro])).rows[0].stripe_subscription_id,'sub_fixture');
  assert.equal(await invoice(a,paid),true);await finish(a,paid);
});
test('different invoice event IDs concurrently record one null-intent payment and reset once',async()=>{
  const qs=await Promise.all([claim(a,'evt_invoice_A'),claim(b,'evt_invoice_B','invoice.payment_succeeded')]);
  const values=await Promise.all([invoice(a,qs[0],'in_concurrent'),invoice(b,qs[1],'in_concurrent')]);assert.deepEqual(values.sort(),[false,true]);
  assert.equal(Number((await a.query("SELECT count(*) FROM public.payments WHERE metadata->>'invoice_id'='in_concurrent'")).rows[0].count),1);
  await a.query('UPDATE public.pros SET monthly_accepted_lead_count=3 WHERE id=$1',[pro]);await invoice(a,qs[0],'in_concurrent');
  assert.equal((await a.query('SELECT monthly_accepted_lead_count FROM public.pros WHERE id=$1',[pro])).rows[0].monthly_accepted_lead_count,3);
});
test('real transaction rolls back invoice insert when subsequent pro update fails',async()=>{
  await owner.query("CREATE FUNCTION public.fixture_fail_pro() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF current_setting('boc_fixture.fail_pro',true)='yes' THEN RAISE EXCEPTION 'fixture injected pro failure'; END IF; RETURN NEW; END $$; CREATE TRIGGER fixture_fail BEFORE UPDATE ON public.pros FOR EACH ROW EXECUTE FUNCTION public.fixture_fail_pro();");
  const q=await claim(a,'evt_rollback');await a.query("SET boc_fixture.fail_pro='yes'");await assert.rejects(invoice(a,q,'in_rollback'),/fixture injected/);await a.query("SET boc_fixture.fail_pro='no'");
  assert.equal(Number((await a.query("SELECT count(*) FROM public.payments WHERE metadata->>'invoice_id'='in_rollback'")).rows[0].count),0);
  assert.equal(await invoice(a,q,'in_rollback'),true);
});
test('subscription insert rolls back on pro-link failure and recovers without duplicate rows',async()=>{
  const otherPro=randomUUID();await owner.query('INSERT INTO public.pros(id,user_id) VALUES($1,$2)',[otherPro,randomUUID()]);
  const q=await claim(a,'evt_sub_atomic','customer.subscription.created',190,'sub_atomic');const data={...snapshot('sub_atomic',75),cleaner_id:otherPro};
  await a.query("SET boc_fixture.fail_pro='yes'");await assert.rejects(sync(a,q,data),/fixture injected/);await a.query("SET boc_fixture.fail_pro='no'");
  assert.equal(Number((await a.query("SELECT count(*) FROM public.subscriptions WHERE stripe_subscription_id='sub_atomic'")).rows[0].count),0);
  await sync(a,q,data);assert.equal(Number((await a.query("SELECT count(*) FROM public.subscriptions WHERE stripe_subscription_id='sub_atomic'")).rows[0].count),1);
  assert.equal((await a.query('SELECT stripe_subscription_id FROM public.pros WHERE id=$1',[otherPro])).rows[0].stripe_subscription_id,'sub_atomic');
});
test('failure while enqueuing outbox rolls back payment and captured acceptance',async()=>{
  await owner.query("CREATE FUNCTION public.fixture_fail_outbox() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF current_setting('boc_fixture.fail_outbox',true)='yes' THEN RAISE EXCEPTION 'fixture injected outbox failure'; END IF; RETURN NEW; END $$; CREATE TRIGGER fixture_fail_outbox BEFORE INSERT ON public.notification_logs FOR EACH ROW EXECUTE FUNCTION public.fixture_fail_outbox();");
  const q=await claim(a,'evt_lead_rollback','checkout.session.completed');await a.query("SET boc_fixture.fail_outbox='yes'");await assert.rejects(lead(a,q),/fixture injected outbox/);await a.query("SET boc_fixture.fail_outbox='no'");
  assert.equal((await a.query('SELECT status FROM public.lead_acceptances WHERE id=$1',[acceptance])).rows[0].status,'pending');
  assert.equal(Number((await a.query("SELECT count(*) FROM public.payments WHERE stripe_payment_intent_id='pi_fixture'")).rows[0].count),0);
  assert.equal(Number((await a.query("SELECT count(*) FROM public.notification_logs WHERE event_type='paid_lead_handoff'")).rows[0].count),0);
});
test('real lead capture/payment/outbox are atomic and concurrent retries deduplicate',async()=>{
  const qs=await Promise.all([claim(a,'evt_lead_A','checkout.session.completed'),claim(b,'evt_lead_B','checkout.session.completed')]);
  const results=await Promise.all([lead(a,qs[0]),lead(b,qs[1])]);assert.deepEqual(results.sort(),[false,true]);
  const row=(await a.query("SELECT status,captured_at FROM public.lead_acceptances WHERE id=$1",[acceptance])).rows[0];assert.equal(row.status,'captured');
  await lead(a,qs[0]);assert.equal((await a.query('SELECT captured_at FROM public.lead_acceptances WHERE id=$1',[acceptance])).rows[0].captured_at.toISOString(),row.captured_at.toISOString());
  assert.equal(Number((await a.query("SELECT count(*) FROM public.notification_logs WHERE event_type='paid_lead_handoff'")).rows[0].count),1);
});
test('invoice duplicate blocks on transaction lock then observes the committed payment',async()=>{
  const qa=await claim(a,'evt_block_A'),qb=await claim(b,'evt_block_B');
  await a.query('BEGIN');assert.equal(await invoice(a,qa,'in_blocked'),true);
  const pid=(await b.query('SELECT pg_backend_pid() AS pid')).rows[0].pid;
  let settled=false;const pending=invoice(b,qb,'in_blocked').finally(()=>{settled=true;});
  let observed=false;
  for(let i=0;i<50;i++){
    const row=(await owner.query('SELECT wait_event_type FROM pg_stat_activity WHERE pid=$1',[pid])).rows[0];
    if(row?.wait_event_type==='Lock'){observed=true;break;}
    await new Promise(r=>setTimeout(r,10));
  }
  assert.equal(observed,true,'second independent connection must wait on a real PostgreSQL lock');assert.equal(settled,false);
  await a.query('COMMIT');assert.equal(await pending,false);
  assert.equal(Number((await a.query("SELECT count(*) FROM public.payments WHERE metadata->>'invoice_id'='in_blocked'")).rows[0].count),1);
});
test('snapshot supersession prevents reverse commit at equal event seconds',async()=>{
  const qa=await claim(a,'evt_snapshot_A','customer.subscription.updated',200),qb=await claim(b,'evt_snapshot_B','customer.subscription.updated',200);
  const ta=await reserve(a,qa),tb=await reserve(b,qb);await sync(b,qb,snapshot('sub_fixture',50,'active'),tb);
  await assert.rejects(sync(a,qa,snapshot('sub_fixture',50,'past_due'),ta),/snapshot superseded/);
  assert.equal((await a.query("SELECT status FROM public.subscriptions WHERE stripe_subscription_id='sub_fixture'")).rows[0].status,'active');
});
test('replacement B generation is independent of old A update clock',async()=>{
  const old=await claim(a,'evt_old_update','customer.subscription.updated',400);await sync(a,old,snapshot());
  const replacement=await claim(b,'evt_new_create','customer.subscription.created',100,'sub_new');await sync(b,replacement,snapshot('sub_new',100));
  assert.equal((await a.query('SELECT stripe_subscription_id FROM public.pros WHERE id=$1',[pro])).rows[0].stripe_subscription_id,'sub_new');
  const later=await claim(a,'evt_old_later','customer.subscription.updated',500);await sync(a,later,snapshot());
  assert.equal((await a.query('SELECT stripe_subscription_id FROM public.pros WHERE id=$1',[pro])).rows[0].stripe_subscription_id,'sub_new');
});
test('cancellation retains owning ID and rejects same-generation different ID',async()=>{
  const cancel=await claim(a,'evt_new_cancel','customer.subscription.deleted',600,'sub_new');await sync(a,cancel,snapshot('sub_new',100,'canceled'));
  const row=(await a.query('SELECT stripe_subscription_id,stripe_subscription_owner_id FROM public.pros WHERE id=$1',[pro])).rows[0];assert.equal(row.stripe_subscription_id,null);assert.equal(row.stripe_subscription_owner_id,'sub_new');
  for(const type of ['created','updated','deleted']){
    const q=await claim(a,`evt_equal_${type}`,`customer.subscription.${type}`,700,'sub_equal');await assert.rejects(sync(a,q,snapshot('sub_equal',100,type==='deleted'?'canceled':'active')),/Ambiguous equal-second/);
  }
  assert.equal(Number((await a.query("SELECT count(*) FROM public.subscriptions WHERE stripe_subscription_id='sub_equal'")).rows[0].count),0);
});
test('real outbox claims are exclusive; backoff and recovery completion are fenced',async()=>{
  const hash='boc:lead-handoff:pi_fixture';const t1=randomUUID(),t2=randomUUID();
  const qs=await Promise.all([a.query('SELECT * FROM public.claim_paid_lead_handoff($1,$2)',[hash,t1]),b.query('SELECT * FROM public.claim_paid_lead_handoff($1,$2)',[hash,t2])]);assert.equal(qs[0].rowCount+qs[1].rowCount,1);
  const winner=qs[0].rowCount?t1:t2;const id=(qs[0].rows[0]||qs[1].rows[0]).id;
  await a.query('SELECT public.finish_paid_lead_handoff($1,$2,false)',[id,winner]);assert.equal((await a.query('SELECT * FROM public.claim_paid_lead_handoff($1,$2)',[hash,randomUUID()])).rowCount,0);
  await owner.query("UPDATE public.notification_logs SET next_retry_at=now()-interval '1 second' WHERE id=$1",[id]);const fresh=randomUUID();await a.query('SELECT * FROM public.claim_paid_lead_handoff($1,$2)',[hash,fresh]);
  await assert.rejects(a.query('SELECT public.finish_paid_lead_handoff($1,$2,true)',[id,winner]),/claim lost/);await a.query('SELECT public.finish_paid_lead_handoff($1,$2,true)',[id,fresh]);
});
test('unique invoice identity constraint prevents direct duplicate payments',async()=>{
  await assert.rejects(a.query("INSERT INTO public.payments(cleaner_id,amount,currency,status,metadata) VALUES($1,30,'usd','succeeded','{\"invoice_id\":\"in_concurrent\"}')",[pro]),/duplicate key/);
});
test('unprivileged role cannot invoke money RPCs',async()=>{
  const anon=await connection('boc_anon');await assert.rejects(anon.query('SELECT * FROM public.claim_stripe_webhook_event($1,$2,$3)',[randomUUID(),'evt_anon','invoice.paid']),/permission denied/);
});

test('migration rejects existing duplicate invoice identities without silently deleting them',async()=>{
  const migration=fs.readFileSync(path.resolve('supabase/migrations/20260921014926_atomic_stripe_webhook_claim.sql'),'utf8');
  await owner.query('BEGIN');await owner.query('DROP INDEX public.payments_succeeded_invoice_unique');
  await owner.query("INSERT INTO public.payments(cleaner_id,amount,currency,status,metadata) VALUES($1,30,'usd','succeeded','{\"invoice_id\":\"in_concurrent\"}')",[pro]);
  await assert.rejects(owner.query(migration),/could not create unique index/);await owner.query('ROLLBACK');
  assert.equal(Number((await a.query("SELECT count(*) FROM public.payments WHERE metadata->>'invoice_id'='in_concurrent'")).rows[0].count),1);
});
