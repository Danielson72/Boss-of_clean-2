# Public Submission Abuse Protection — 2026-09-21

This review covers public or customer-facing write paths. It distinguishes
browser-only controls from persistent server controls.

| Submission path | Prior control | Current control in this branch | Limit key |
|---|---|---|---|
| Customer quote request | Server-side database limiter | Same limiter plus hidden bot field | IP, 10/minute |
| Customer signup | Page middleware only; privileged setup accepted a browser user ID | Trusted server signup, hidden bot field, persistent limiter | IP, 5/minute |
| Pro signup | Page middleware only; privileged setup accepted a browser user ID | Trusted server signup, hidden bot field, persistent limiter | IP, 5/minute |
| Password reset | Browser local storage only | Server action, hidden bot field, persistent limiter | IP, 3/hour |
| Contact form | None | API limiter plus hidden bot field | IP, 5/minute |
| Signup alert endpoint | Public POST endpoint | Removed; the existing database-trigger notification remains | Not applicable |

Read-only search and navigation forms are excluded because they do not create
accounts, leads, messages, payments, or stored submissions. Signed-in review
and message routes already use server-side limits and were not changed here.

## Behavior

- A filled hidden field returns a normal-looking success response and performs
  no database, email, or notification side effect.
- Human-looking submissions reach the existing atomic database limiter.
- The quote form keeps its existing customer-session requirement in addition
  to the IP limit.
- Consent user-agent evidence is now taken from request headers rather than
  browser form data.

## Automated evidence

- A 50-request quote burst simulation permits the first 10 requests and blocks
  the remaining 40.
- A filled hidden field is silently dropped before the limiter runs.
- The cross-account consent regression from the parent authorization branch
  continues to pass.

## Remaining infrastructure consideration

The database limiter preserves its existing fail-open behavior when the RPC is
unavailable. These write paths depend on the same database for their primary
operation, so a database outage still prevents useful side effects. If the
limiter is later moved to a separate service, revisit this policy explicitly.
