-- Rolled-back allow/deny test for 20261101120000_messaging_hire_rls_lockdown.sql
-- (DLD-693 S2/S3, DLD-694 S4, DLD-703 F1-F3).
--
-- Run AFTER the migration body in the same transaction (or against a DB where
-- it is applied). The final RAISE always aborts, so nothing persists: the
-- error message carries the PASS/FAIL table. Uses the two busiest live
-- conversations as fixtures; every change is undone by the abort.
DO $rlstest$
DECLARE
  c1 uuid; c2 uuid; cu uuid; pid uuid; pu uuid; ou uuid;
  mp uuid; mc uuid; q uuid; qcleaner uuid;
  r record; n int; res text; ok boolean; out text := ''; fails int := 0; total int := 0;
  before_cnt int; after_cnt int;
BEGIN
  -- Fixtures: busiest conversation with both sides; outsider = a pro not in it.
  SELECT c.id, c.customer_id, c.cleaner_id, p.user_id INTO c1, cu, pid, pu
  FROM conversations c JOIN pros p ON p.id = c.cleaner_id
  WHERE EXISTS (SELECT 1 FROM messages m WHERE m.conversation_id = c.id AND m.sender_role = 'customer')
    AND EXISTS (SELECT 1 FROM messages m WHERE m.conversation_id = c.id AND m.sender_role <> 'customer')
  ORDER BY (SELECT count(*) FROM messages m WHERE m.conversation_id = c.id) DESC LIMIT 1;
  SELECT id INTO c2 FROM conversations WHERE customer_id = cu AND id <> c1 LIMIT 1;
  SELECT p.user_id INTO ou FROM pros p WHERE p.id <> pid AND p.user_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM conversations c WHERE c.id = c1 AND c.customer_id = p.user_id) LIMIT 1;
  SELECT id INTO mp FROM messages WHERE conversation_id = c1 AND sender_role <> 'customer' ORDER BY created_at DESC LIMIT 1;
  SELECT id INTO mc FROM messages WHERE conversation_id = c1 AND sender_role = 'customer' ORDER BY created_at DESC LIMIT 1;
  SELECT id, cleaner_id INTO q, qcleaner FROM quote_requests WHERE customer_id = cu AND cleaner_id IS NOT NULL LIMIT 1;

  FOR r IN SELECT * FROM (VALUES
    -- id, actor, setup (as owner, guard-exempt), statement, expect
    ('S2a customer rewrites pro message', 'cu', NULL, 'UPDATE messages SET content=''x'' WHERE id=$mp', 'deny'),
    ('S2b customer edits own message', 'cu', NULL, 'UPDATE messages SET content=''x'' WHERE id=$mc', 'deny'),
    ('S2c customer moves own message to other thread', 'cu', NULL, 'UPDATE messages SET conversation_id=$c2 WHERE id=$mc', 'deny'),
    ('S2d customer changes sender_id', 'cu', NULL, 'UPDATE messages SET sender_id=$pu WHERE id=$mc', 'deny'),
    ('S2e outsider updates message', 'ou', NULL, 'UPDATE messages SET read_at=now() WHERE id=$mp', 'deny'),
    ('S2f customer marks pro msgs read (app path)', 'cu', 'UPDATE messages SET read_at=NULL WHERE id=$mp', 'UPDATE messages SET read_at=now() WHERE conversation_id=$c1 AND sender_role=''cleaner'' AND read_at IS NULL', 'allow'),
    ('S2g pro marks customer msgs read (app path)', 'pu', 'UPDATE messages SET read_at=NULL WHERE id=$mc', 'UPDATE messages SET read_at=now() WHERE conversation_id=$c1 AND sender_role=''customer'' AND read_at IS NULL', 'allow'),
    ('S2h customer reports pro msg (app path)', 'cu', 'UPDATE messages SET reported_at=NULL, report_reason=NULL, reported_by=NULL WHERE id=$mp', 'UPDATE messages SET reported_at=now(), report_reason=''test'', reported_by=$cu WHERE id=$mp', 'allow'),
    ('S2i customer reports in pro''s name', 'cu', 'UPDATE messages SET reported_at=NULL, report_reason=NULL, reported_by=NULL WHERE id=$mp', 'UPDATE messages SET reported_at=now(), report_reason=''t'', reported_by=$pu WHERE id=$mp', 'deny'),
    ('S3a customer changes cleaner_id', 'cu', NULL, 'UPDATE conversations SET cleaner_id=gen_random_uuid() WHERE id=$c1', 'deny'),
    ('S3b customer changes customer_id', 'cu', NULL, 'UPDATE conversations SET customer_id=$ou WHERE id=$c1', 'deny'),
    ('S3c pro sets quote_request_id', 'pu', NULL, 'UPDATE conversations SET quote_request_id=gen_random_uuid() WHERE id=$c1', 'deny'),
    ('S3d customer zeroes own counter (app path)', 'cu', 'UPDATE conversations SET customer_unread_count=5 WHERE id=$c1', 'UPDATE conversations SET customer_unread_count=0 WHERE id=$c1', 'allow'),
    ('S3e customer sends message, pro counter bumps', 'cu', NULL, 'INSERT INTO messages (conversation_id, sender_id, sender_role, content) VALUES ($c1, $cu, ''customer'', ''rls test'')', 'allow'),
    ('S3f pro sends message, customer counter bumps', 'pu', NULL, 'INSERT INTO messages (conversation_id, sender_id, sender_role, content) VALUES ($c1, $pu, ''cleaner'', ''rls test'')', 'allow'),
    ('S4a pro inserts own hire confirmation', 'pu', NULL, 'INSERT INTO hire_confirmations (quote_request_id, customer_id, cleaner_id) VALUES ($q, $cu, $qcleaner)', 'deny'),
    ('S4b customer confirms wrong pro', 'cu', NULL, 'INSERT INTO hire_confirmations (quote_request_id, customer_id, cleaner_id) VALUES ($q, $cu, gen_random_uuid())', 'deny'),
    ('S4c customer confirms quote pro (app path)', 'cu', 'DELETE FROM hire_confirmations WHERE quote_request_id=$q', 'INSERT INTO hire_confirmations (quote_request_id, customer_id, cleaner_id) VALUES ($q, $cu, $qcleaner)', 'allow'),
    ('F1a reported pro erases report', 'pu', 'UPDATE messages SET reported_at=now(), report_reason=''r'', reported_by=$cu WHERE id=$mp', 'UPDATE messages SET reported_at=NULL, report_reason=NULL WHERE id=$mp', 'deny'),
    ('F1b reported pro re-signs report as self', 'pu', 'UPDATE messages SET reported_at=now(), report_reason=''r'', reported_by=$cu WHERE id=$mp', 'UPDATE messages SET reported_by=$pu WHERE id=$mp', 'deny'),
    ('F1c pro self-reports own message', 'pu', 'UPDATE messages SET reported_at=NULL, report_reason=NULL, reported_by=NULL WHERE id=$mp', 'UPDATE messages SET reported_at=now(), report_reason=''r'', reported_by=$pu WHERE id=$mp', 'deny'),
    ('F2a sender fakes read receipt', 'pu', 'UPDATE messages SET read_at=NULL WHERE id=$mp', 'UPDATE messages SET read_at=now() WHERE id=$mp', 'deny'),
    ('F2b recipient un-reads message', 'cu', 'UPDATE messages SET read_at=now() WHERE id=$mp', 'UPDATE messages SET read_at=NULL WHERE id=$mp', 'deny'),
    ('F3a customer zeroes pro counter', 'cu', 'UPDATE conversations SET cleaner_unread_count=5 WHERE id=$c1', 'UPDATE conversations SET cleaner_unread_count=0 WHERE id=$c1', 'deny'),
    ('F3b pro zeroes customer counter', 'pu', 'UPDATE conversations SET customer_unread_count=5 WHERE id=$c1', 'UPDATE conversations SET customer_unread_count=0 WHERE id=$c1', 'deny'),
    ('F3c pro zeroes own counter (app path)', 'pu', 'UPDATE conversations SET cleaner_unread_count=5 WHERE id=$c1', 'UPDATE conversations SET cleaner_unread_count=0 WHERE id=$c1', 'allow'),
    ('SVC service role sets quote_request_id (DLD-696)', 'svc', NULL, 'UPDATE conversations SET quote_request_id=$q WHERE id=$c1', 'allow')
  ) AS t(label, actor, setup, stmt, expect)
  LOOP
    total := total + 1;
    BEGIN
      IF r.setup IS NOT NULL THEN
        EXECUTE replace(replace(replace(replace(replace(replace(replace(replace(r.setup,
          '$mp', quote_literal(mp)), '$mc', quote_literal(mc)), '$c1', quote_literal(c1)), '$c2', quote_literal(c2)),
          '$cu', quote_literal(cu)), '$pu', quote_literal(pu)), '$ou', quote_literal(ou)), '$q', quote_literal(q));
      END IF;
      SELECT cleaner_unread_count + customer_unread_count INTO before_cnt FROM conversations WHERE id = c1;
      IF r.actor = 'svc' THEN
        PERFORM set_config('request.jwt.claims', json_build_object('role','service_role')::text, true);
        EXECUTE 'SET LOCAL ROLE service_role';
      ELSE
        PERFORM set_config('request.jwt.claims', json_build_object('role','authenticated','sub',
          CASE r.actor WHEN 'cu' THEN cu WHEN 'pu' THEN pu ELSE ou END)::text, true);
        EXECUTE 'SET LOCAL ROLE authenticated';
      END IF;
      EXECUTE replace(replace(replace(replace(replace(replace(replace(replace(replace(r.stmt,
        '$mp', quote_literal(mp)), '$mc', quote_literal(mc)), '$c1', quote_literal(c1)), '$c2', quote_literal(c2)),
        '$cu', quote_literal(cu)), '$pu', quote_literal(pu)), '$ou', quote_literal(ou)), '$qcleaner', quote_literal(qcleaner)), '$q', quote_literal(q));
      GET DIAGNOSTICS n = ROW_COUNT;
      EXECUTE 'RESET ROLE';
      PERFORM set_config('request.jwt.claims', '', true);
      SELECT cleaner_unread_count + customer_unread_count INTO after_cnt FROM conversations WHERE id = c1;
      res := 'rows=' || n || CASE WHEN r.stmt LIKE 'INSERT INTO messages%' THEN ' counters ' || before_cnt || '->' || after_cnt ELSE '' END;
      ok := CASE WHEN r.expect = 'allow' THEN n > 0 AND (r.stmt NOT LIKE 'INSERT INTO messages%' OR after_cnt = before_cnt + 1) ELSE n = 0 END;
      RAISE EXCEPTION USING ERRCODE = 'P0099', MESSAGE = res;  -- undo this case
    EXCEPTION WHEN OTHERS THEN
      IF SQLSTATE <> 'P0099' THEN
        res := 'error ' || SQLSTATE || ': ' || left(SQLERRM, 70);
        ok := (r.expect = 'deny' AND SQLSTATE IN ('42501'));
      END IF;
    END;
    IF NOT ok THEN fails := fails + 1; END IF;
    out := out || E'\n' || CASE WHEN ok THEN 'PASS ' ELSE 'FAIL ' END || r.label || ' [expect ' || r.expect || '] ' || res;
  END LOOP;

  RAISE EXCEPTION 'RLS TEST %/% passed (fixtures c1=% q=%):%', total - fails, total, c1, q, out;
END
$rlstest$;
