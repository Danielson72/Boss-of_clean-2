# Next.js 16 upgrade notes

Date: 2026-09-21

## Scope

- Upgrades Next.js from 13.5.11 to 16.3.5 and React from 18.2.0 to 19.3.0.
- Pins the project runtime to Node 22 through `.nvmrc`; Netlify already uses Node 22.
- Migrates request APIs to their async Next.js 16 forms.
- Renames `middleware.ts` to `proxy.ts`, preserving the existing routing and rate-limit behavior.
- Adds Suspense boundaries around client pages that call `useSearchParams`.
- Migrates the ESLint command to the supported flat-config CLI flow.
- Updates React 19 peer dependencies and the React DayPicker v9 calendar API.
- Removes unused legacy Supabase auth helper/UI packages and the obsolete Next WASM package.

## Validation

- `npm run lint`: passes with 0 errors. Existing and newly surfaced advisory findings remain warnings.
- `npm run build`: passes with Next.js 16.3.5 and the default Turbopack build across all 91 routes. Local validation used non-secret placeholder public Supabase values because local environment files are intentionally absent.
- `npm run test:e2e -- --list`: discovers 75 Playwright tests in 7 files.
- `npm audit --omit=dev`: reports 0 known vulnerabilities after the lockfile refresh.
- `npx tsc --noEmit`: still reports the repository's pre-existing type-error baseline. The one new React 19 callback-ref error was repaired; the production build continues to honor the repository's existing `typescript.ignoreBuildErrors` setting.

## Deployment notes

- This branch is safe for a Netlify deploy preview. It does not change production environment variables or database state.
- Review the deploy preview's login, signup, password reset, search, quote request, dashboard routing, billing, and calendar interactions before merge.
- The production deployment remains merge-triggered; this draft does not merge or publish to production.

## References

- Next.js support policy: https://nextjs.org/support-policy
- Next.js 16 upgrade guide: https://nextjs.org/docs/app/guides/upgrading/version-16
