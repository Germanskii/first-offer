# Validation record

Rechecked on **29 October 2026**, Windows, isolated **Node.js 24.22.2** runtime.
Dependencies installed with `npm ci --ignore-scripts` after inspection of the
package scripts and lockfile. No production configuration, service or account
data was used.

## Executed checks

- The original suite passed **20 tests** before changes.
- New regressions reproduced HTTP 503 for malformed JSON on `/api/state` and
  `/api/search-profile`. Both now reject malformed or non-object JSON with
  HTTP 400 before storage access.
- The updated suite passed **22 tests**, including client workflows in JSDOM,
  SQLite migration/state checks, isolation, revisions and PDF generation.
- `npm run check` passed for **22 JavaScript modules** and the fictional feed.
- `npm run build:resume-pdf` passed; the generated bundle has no content diff.
- A real loopback-only server served HTML, saved/reloaded fictional state,
  kept the guest account separate, rejected anonymous API access and returned
  HTTP 400 for malformed JSON. The server was stopped afterwards.

Node 22.13 in the old README was insufficient for the pinned JSDOM dependency.
The manifest now declares `^22.22.2 || ^24.15.0 || >=26.0.0`; only Node 24.22.2
was exercised locally. The CI build/reproducibility step is prepared but has not
yet run remotely on this branch.

## Dependency audit

The initial `npm audit` reported two high-severity affected packages and four
moderate affected packages. Compatible lockfile updates changed `source-map-js`
from 1.2.1 to 1.2.2 and `undici` from 8.11.2 to 8.12.3. The final audit reports
**zero high/critical and four moderate** affected packages; these counts refer
to dependency nodes and can share the same underlying advisory.

The remaining chain is `drizzle-kit` → `@esbuild-kit/esm-loader` →
`@esbuild-kit/core-utils` → an older `esbuild`. Its
[advisory](https://github.com/advisories/GHSA-67mh-4wv8-2f99) concerns esbuild's
development server. The local app uses Node's HTTP server, and PDF bundling uses
the separate direct esbuild 0.25.12 dependency. No vulnerable dev server was run.
The runtime-only npm audit reports no known advisories. This is a dated check,
not a blanket security guarantee. No forced downgrade or untested dependency
override was applied to Drizzle Kit.

## Limits

No real-browser visual pass, accessibility audit, external authentication gateway,
public deployment or production data migration was tested. JSDOM, Worker tests
and local HTTP checks do not validate a hosted authentication boundary. The
development adapter must remain loopback-only. No license or visibility was changed.
