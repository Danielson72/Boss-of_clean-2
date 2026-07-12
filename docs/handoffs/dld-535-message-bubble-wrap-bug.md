# DLD-535: Message bubbles wrap mid-word / mid-number

**Status:** Investigate-only (per safety contract). Fix drafted as diff below, NOT applied.
**Investigated:** 2026-05-27 by CTO agent
**Reproducer:** `bossofclean.com/dashboard/messages/<conversation-id>`
**Reported by:** Daniel (live testing, 2026-05-27 ~2:20 PM ET)

---

## TL;DR

It is **not** `word-break: break-all` or `overflow-wrap: anywhere`. The codebase contains zero `break-all` rules. The `<p>` already uses Tailwind's `break-words` (= `overflow-wrap: break-word`), which is the correct setting.

The actual cause is a **circular sizing trap**: the bubble's `max-w-[75%]` is placed on a child of a shrink-to-fit parent. The percentage cannot resolve against a finite parent width, so the browser collapses the bubble down to the smallest size its content can be broken to. With `break-words` enabled, the renderer is free to break any word — including `$200` → `$2 / 00` — to satisfy the impossible constraint.

**Minimal fix:** move `max-w-[75%]` up one level, from the inner bubble onto the outer `relative` wrapper, so it resolves against the flex row instead of itself.

---

## Offending code

`components/messaging/MessageThread.tsx` lines **89–98**:

```tsx
<div className={`flex ${isSent ? 'justify-end' : 'justify-start'} group`}>
  <div className="relative">                          {/* shrink-to-content flex item */}
    <div
      className={`max-w-[75%] rounded-2xl px-4 py-2 ${  /* ← circular constraint */
        isSent
          ? 'bg-blue-600 text-white rounded-br-md'
          : 'bg-gray-100 text-gray-900 rounded-bl-md'
      }`}
    >
      <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
```

### Why this produces character-level breaks

1. The outer `<div className="relative">` is a flex item of `flex justify-end` with default `flex: 0 1 auto`. With no explicit width, it shrink-wraps to its content.
2. The inner bubble has `max-w-[75%]`. Per CSS Sizing 3, a percentage `max-width` needs a definite parent width to resolve against.
3. The parent's used width *is* the child's used width (shrink-to-fit), so the constraint becomes "bubble width ≤ 75% × bubble width" — circular.
4. Chromium resolves this by computing the bubble's intrinsic min-content size and applying the percentage to that, then iterating. Combined with `break-words`, the layout engine is permitted to break inside words to converge on the smallest stable size — which is what produces `$2 / 00`, `407` squeezed to digit width, and `eat bigs of` / `donuts`.

The `break-words` (`overflow-wrap: break-word`) on the `<p>` is doing exactly what it's told: when a word would overflow the container, break it. The bug is that the container has been told to be impossibly small.

---

## Why "the bubble looks too tight" is the symptom, not the cause

Daniel's observation that `407` renders in a bubble "squeezed to the width of the digits" is the same root cause: the bubble has converged to the smallest content size the renderer can find. Short messages collapse to their min-content; longer messages with breakable words get those words broken to fit.

---

## What's NOT broken (confirmed)

- No `word-break: break-all` anywhere in the repo. (`grep -rn "break-all|word-break|overflow-wrap"` on `**/*.{tsx,ts,css}` → only `break-words` occurrences.)
- PII wall is correctly allowing `$200` through as a non-PII token. The bug is purely visual.
- `whitespace-pre-wrap` is correct (preserves intentional newlines).
- `break-words` is the *correct* token-safe wrap policy. Do not change it.

---

## Proposed fix (NOT applied)

Move `max-w-[75%]` from the inner bubble to the outer `.relative` wrapper. The wrapper then becomes the constrained flex item, sized against the flex row (which has a definite width from the `max-w-4xl` parent). The inner bubble naturally fills the constrained space without circular sizing, and `break-words` only kicks in when a single word genuinely doesn't fit.

```diff
--- a/components/messaging/MessageThread.tsx
+++ b/components/messaging/MessageThread.tsx
@@ -87,9 +87,9 @@ export function MessageThread({ messages, isCustomer, currentUserId }: MessageTh
             )}
             <div className={`flex ${isSent ? 'justify-end' : 'justify-start'} group`}>
-              <div className="relative">
+              <div className="relative max-w-[75%]">
                 <div
-                  className={`max-w-[75%] rounded-2xl px-4 py-2 ${
+                  className={`rounded-2xl px-4 py-2 ${
                     isSent
                       ? 'bg-blue-600 text-white rounded-br-md'
                       : 'bg-gray-100 text-gray-900 rounded-bl-md'
                   }`}
                 >
                   <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
```

### Expected result after fix

- `$200` stays as `$200` on one line (or wraps as a whole token onto the next line if it genuinely doesn't fit).
- `407` lives in a bubble sized to a sensible minimum (padding + text + timestamp row), not collapsed to digit width.
- `eat bigs of donuts` wraps only if the full string exceeds 75% of the chat thread width (~648 px at desktop), and wraps at the last word boundary that fits, not mid-token.
- No change to received-vs-sent bubble colors, rounded corners, report menu positioning, or layout flow — the `relative` wrapper still hosts the absolutely-positioned MoreVertical menu and report dialog correctly because the `max-w-[75%]` only constrains its outer extent.

---

## Scope check

`MessageThread` is referenced in exactly one place:

```
app/dashboard/messages/[conversationId]/page.tsx:7   import { MessageThread } from '@/components/messaging/MessageThread';
```

No other component shares this bubble pattern. `ConversationList`, `MessageInput`, and `StartConversationButton` use different layouts. The fix is fully isolated to `MessageThread.tsx` and affects only `/dashboard/messages/[conversationId]`.

Other files using `break-words`:
- `app/dashboard/customer/page.tsx:431` — `<h3>` heading, no max-width interaction
- `app/dashboard/admin/users/[id]/page.tsx:357` — `<p>` in a definite-width grid cell
- `components/ui/breadcrumb.tsx:22` — shadcn primitive, definite width context

None reproduce the circular sizing trap. The fix should NOT touch them.

---

## Responsive note

`max-w-[75%]` is fine at every breakpoint because the chat thread container (`max-w-4xl mx-auto`) already caps the row width on desktop, and on mobile 75% of viewport leaves room for the report menu (absolutely positioned at `-right-8`). If we later want tighter widths on very wide displays, this can become `max-w-[75%] lg:max-w-[60%]` — but that is an enhancement, not part of this fix.

---

## Verification checklist (post-merge, for Daniel)

When the diff is applied and the dev server is up:

1. Open the same conversation: `/dashboard/messages/6e3a28d0-0c5c-43c8-b46e-e990c03eaed6`
2. Confirm `$200` renders on a single line, not broken.
3. Confirm `407` bubble has visible padding around the digits.
4. Send a long single word (e.g. paste a long URL or `abcdefghijklmnopqrstuvwxyz1234567890`) and confirm it does break — that is expected `break-words` behavior so it doesn't overflow the bubble.
5. Resize browser to 375 px width (iPhone SE) and confirm bubbles still respect 75% of viewport and don't break short tokens.
6. Confirm the More/Report menu still opens to the right of received messages and stays visible.

---

## Files touched by this investigation

- Read-only: `components/messaging/MessageThread.tsx`, `app/dashboard/messages/[conversationId]/page.tsx`, `app/dashboard/messages/page.tsx`
- No code changes, no commits, no pushes. Per safety contract.
