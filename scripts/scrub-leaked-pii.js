#!/usr/bin/env node

/**
 * One-shot cleanup: scrub PII from messages on a single conversation.
 *
 * Why this exists: the server-side PII filter (lib/pii-filter.ts) had a
 * gating bug that let pro→customer messages through on conversations with
 * quote_request_id IS NULL. This pre-fix backfill scrubs a single known
 * conversation's history before the new gating goes live.
 *
 * The regex patterns below MIRROR lib/pii-filter.ts PII_PATTERNS exactly.
 * If you change one, change both.
 *
 * Run once:
 *   node --env-file=.env.local scripts/scrub-leaked-pii.js
 *
 * Required env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

const { createClient } = require('@supabase/supabase-js');

const TARGET_CONVERSATION = 'd0d7b9fa-7eed-46c2-9065-86b1de22559e';

// Mirror of lib/pii-filter.ts PII_PATTERNS — same order, same expressions.
const PII_PATTERNS = [
  { name: 'phone_number',   re: /(\+?1[\s.-]?)?\(?\d{3}\)?[\s.\-]?\d{3}[\s.\-]?\d{4}/ },
  { name: 'email_address',  re: /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/ },
  { name: 'zelle',          re: /\bzelle\b/i },
  { name: 'venmo',          re: /\bvenmo\b/i },
  { name: 'cash_app',       re: /\bcash\s*app\b|\$[a-zA-Z][a-zA-Z0-9_]{1,19}/i },
  { name: 'paypal',         re: /\bpaypal\b/i },
  { name: 'contact_phrase', re: /\b(call me at|text me at|my number is|reach me at|contact me at|my phone is|my cell is)\b/i },
  { name: 'whatsapp',       re: /\bwhatsapp\b|\bwa\.me\b/i },
];

function scrubText(content) {
  const matches = [];
  let scrubbed = content;
  for (const { name, re } of PII_PATTERNS) {
    const flags = re.flags.includes('g') ? re.flags : re.flags + 'g';
    const globalRe = new RegExp(re.source, flags);
    if (globalRe.test(scrubbed)) {
      matches.push(name);
      scrubbed = scrubbed.replace(new RegExp(re.source, flags), '[redacted]');
    }
  }
  return { scrubbed, matches };
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const supabase = createClient(url, serviceKey, { auth: { persistSession: false } });

  const { data, error } = await supabase
    .from('messages')
    .select('id, sender_role, content, created_at')
    .eq('conversation_id', TARGET_CONVERSATION)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Failed to load messages:', error.message);
    process.exit(1);
  }

  const rows = data || [];
  console.log(`Loaded ${rows.length} message(s) for conversation ${TARGET_CONVERSATION}\n`);

  let scrubbed = 0;
  let clean = 0;
  let failed = 0;

  for (const row of rows) {
    const result = scrubText(row.content);
    if (result.scrubbed === row.content) {
      console.log(`[clean] ${row.id} (${row.sender_role}): "${row.content}"`);
      clean++;
      continue;
    }

    console.log(`[scrub] ${row.id} (${row.sender_role})`);
    console.log(`  patterns: ${result.matches.join(', ')}`);
    console.log(`  before:   ${row.content}`);
    console.log(`  after:    ${result.scrubbed}`);

    const { error: updateError } = await supabase
      .from('messages')
      .update({ content: result.scrubbed })
      .eq('id', row.id);

    if (updateError) {
      console.error(`  FAILED:   ${updateError.message}`);
      failed++;
    } else {
      scrubbed++;
    }
  }

  console.log(`\nDone. clean=${clean}  scrubbed=${scrubbed}  failed=${failed}`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
