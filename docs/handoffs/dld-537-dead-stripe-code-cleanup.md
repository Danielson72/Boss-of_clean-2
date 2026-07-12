# DLD-537 — Dead Stripe Code Cleanup (Findings Report)

**Mode:** INVESTIGATE-ONLY. No code modified. No commits. No push.
**Date:** 2026-05-27
**Author:** CTO (heartbeat run `6e43f82b-2d18-4348-b827-323f6fcd8bb6`)
**Parent audit:** DLD-531 Phase C §1.1

---

## 1. Importer-check results

### 1.1 `lib/stripe/mcp.ts` — `listPrices` (calls `stripe.prices.list` at line 168)

```bash
$ grep -rn "from.*lib/stripe/mcp" --include="*.ts" --include="*.tsx" app/ lib/ components/
app/api/stripe/checkout/route.ts:4:import { createCheckoutSession } from '@/lib/stripe/mcp'
app/api/stripe/portal/route.ts:4:import { createBillingPortalSession, findCustomerByEmail } from '@/lib/stripe/mcp'

$ grep -rn "prices\.list" --include="*.ts" --include="*.tsx" app/ lib/ components/
lib/stripe/mcp.ts:168:  return await stripe.prices.list({ limit })

$ grep -rn "\blistPrices\b" --include="*.ts" --include="*.tsx" app/ lib/ components/
lib/stripe/mcp.ts:151:export async function listPrices(limit = 10) {
```

**Verdict: zero external importers confirmed for `listPrices`.** The only reference is the function's own definition.

### 1.2 `lib/stripe/invoices.ts` — `sendInvoice` (calls `stripe.invoices.sendInvoice` at line 198)

```bash
$ grep -rn "from.*lib/stripe/invoices" --include="*.ts" --include="*.tsx" app/ lib/ components/
lib/types/api.ts:146:// Note: For Stripe invoice types, use InvoiceData from '@/lib/stripe/invoices'
app/api/cleaner/billing/route.ts:4:import { getCustomerInvoices, InvoiceData } from '@/lib/stripe/invoices';
app/api/cleaner/billing/invoices/route.ts:3:import { getCustomerInvoices, getUpcomingInvoice } from '@/lib/stripe/invoices';

$ grep -rn "\bsendInvoice\b" --include="*.ts" --include="*.tsx" app/ lib/ components/
lib/stripe/invoices.ts:194:export async function sendInvoice(invoiceId: string): Promise<boolean> {
lib/stripe/invoices.ts:198:    await stripe.invoices.sendInvoice(invoiceId);
```

**Verdict: zero external importers confirmed for `sendInvoice`.** Only references are the function's own definition and its SDK call.

---

## 2. Wider file inspection (can we delete the whole file?)

### 2.1 `lib/stripe/mcp.ts` — **NO, keep the file.**

The file exports six symbols. Live importers exist for half of them:

| Export                       | Line | Imported by                                                  | Status |
| ---------------------------- | ---- | ------------------------------------------------------------ | ------ |
| `shouldUseMCP`               | 25   | Used internally (4 call sites in same file)                  | LIVE (internal helper) |
| `createCheckoutSession`      | 33   | `app/api/stripe/checkout/route.ts:4`                         | LIVE |
| `createBillingPortalSession` | 79   | `app/api/stripe/portal/route.ts:4`                           | LIVE |
| `findCustomerByEmail`        | 111  | `app/api/stripe/portal/route.ts:4`                           | LIVE |
| `listPrices`                 | 151  | none                                                         | **DEAD** |
| `testMCPConnection`          | 174  | none                                                         | **DEAD (bonus finding)** |

`testMCPConnection` is also unreferenced and was not flagged in DLD-531 §1.1. Same risk profile as `listPrices` (calls `list_prices` MCP tool / no SDK side-effect on prod). Recommend removing it in the same cleanup.

### 2.2 `lib/stripe/invoices.ts` — **NO, keep the file.**

The file exports three symbols and an interface. Two of the three are live:

| Export                | Line | Imported by                                                                                    | Status |
| --------------------- | ---- | ---------------------------------------------------------------------------------------------- | ------ |
| `InvoiceData` (type)  | 7    | `app/api/cleaner/billing/route.ts:4`, referenced by `lib/types/api.ts:146` comment             | LIVE |
| `getCustomerInvoices` | 91   | `app/api/cleaner/billing/route.ts:4`, `app/api/cleaner/billing/invoices/route.ts:3`            | LIVE |
| `getInvoice`          | 126  | none                                                                                           | **DEAD (bonus finding)** |
| `getUpcomingInvoice`  | 144  | `app/api/cleaner/billing/invoices/route.ts:3`                                                  | LIVE |
| `sendInvoice`         | 194  | none                                                                                           | **DEAD** |

`getInvoice` is also unreferenced. It only does a read (`stripe.invoices.retrieve`), no scope concern, but it's dead code in the same payments-critical file. Recommend removing it alongside `sendInvoice`.

---

## 3. Recommended action

| Symbol                                    | Action                                | Confidence |
| ----------------------------------------- | ------------------------------------- | ---------- |
| `lib/stripe/mcp.ts` :: `listPrices`       | **Delete function** (lines 147–169)   | High       |
| `lib/stripe/mcp.ts` :: `testMCPConnection`| Delete function (lines 171–190)       | High (bonus) |
| `lib/stripe/invoices.ts` :: `sendInvoice` | **Delete function** (lines 191–204)   | High       |
| `lib/stripe/invoices.ts` :: `getInvoice`  | Delete function (lines 123–139)       | High (bonus) |
| `lib/stripe/mcp.ts` whole file            | Keep — live exports remain            | n/a        |
| `lib/stripe/invoices.ts` whole file       | Keep — live exports remain            | n/a        |

DLD-531 scope: only `listPrices` and `sendInvoice` were flagged. The bonus removals (`testMCPConnection`, `getInvoice`) are at Daniel's discretion — equally dead, equally safe, but technically outside the issue's chartered scope.

---

## 4. Proposed unified diff (NOT APPLIED)

### 4.1 Conservative version — issue-scope only (removes `listPrices` + `sendInvoice`)

```diff
diff --git a/lib/stripe/mcp.ts b/lib/stripe/mcp.ts
--- a/lib/stripe/mcp.ts
+++ b/lib/stripe/mcp.ts
@@ -144,30 +144,6 @@ export async function findCustomerByEmail(email: string): Promise<CustomerListRe
   }
 }

-/**
- * Get available pricing information
- * Useful for debugging and validation
- */
-export async function listPrices(limit = 10) {
-  if (shouldUseMCP()) {
-    try {
-      // Try MCP first
-      const mcpStripeTool = getMCPStripeTool();
-      const mcpResult = await mcpStripeTool?.list_prices?.({ limit })
-      if (mcpResult) {
-        logger.debug('Prices retrieved via MCP')
-        return mcpResult
-      }
-    } catch (error) {
-      logger.warn('MCP price listing failed, falling back to SDK:', {}, error)
-    }
-  }
-
-  // SDK fallback
-  const stripe = getStripe()
-  return await stripe.prices.list({ limit })
-}
-
 /**
  * Check MCP connectivity (for debugging)
  */
diff --git a/lib/stripe/invoices.ts b/lib/stripe/invoices.ts
--- a/lib/stripe/invoices.ts
+++ b/lib/stripe/invoices.ts
@@ -188,17 +188,3 @@ export async function getUpcomingInvoice(
     return null;
   }
 }
-
-/**
- * Send invoice to customer via email
- */
-export async function sendInvoice(invoiceId: string): Promise<boolean> {
-  const stripe = getStripe();
-
-  try {
-    await stripe.invoices.sendInvoice(invoiceId);
-    return true;
-  } catch (error) {
-    logger.error('Error sending invoice:', {}, error);
-    return false;
-  }
-}
```

### 4.2 Aggressive version — bonus removals included

Adds removal of `testMCPConnection` (lib/stripe/mcp.ts:171–190) and `getInvoice` (lib/stripe/invoices.ts:123–139). Same shape as 4.1, identical safety profile. Diff omitted here to keep the report focused; trivial to extend.

---

## 5. Impact on DLD-531 rk_live_ scope

**Removal does NOT affect the rk_live_ scope grant proposed in DLD-531 §5.**

Reasoning:

- The DLD-531 audit explicitly **excluded** `prices.list` and `sendInvoice` from the rk_live_ permission set because neither was reachable from any live import path.
- Removing dead code shrinks the SDK surface but does not change which Stripe operations the application can actually invoke at runtime — those were already zero.
- After deletion, the SDK call sites for `stripe.prices.list` and `stripe.invoices.sendInvoice` will be gone, so even a future maintainer who reads `lib/stripe/` will no longer have a misleading hint that these scopes "might be needed."

Net effect: the cleanup *reinforces* the DLD-531 minimal-scope decision rather than altering it.

---

## 6. Follow-up suggestions (out of scope for DLD-537)

- Consider adding `ts-prune` or `knip` to CI to catch future dead exports before they accumulate. (Filed as a thought, not a recommended PR.)
- If the bonus removals are accepted, the cleanup PR title should make that explicit, e.g. `chore(stripe): remove dead exports (DLD-537 + bonus)`.

---

## 7. Verification snippet (for the eventual merge PR)

After deletion, run:

```bash
grep -rn "listPrices\|testMCPConnection\|sendInvoice\|getInvoice" --include="*.ts" --include="*.tsx" app/ lib/ components/
# Expected output: only definition-site matches if bonus skipped; zero matches if bonus included.
npm run build
# Expected: clean build, no orphan-import errors.
```

---

**End of report.** Daniel: ready when you are. Cleanup PR can be merged on a feature branch (`chore/dld-537-stripe-dead-code`) per the governance rule against direct main commits.
