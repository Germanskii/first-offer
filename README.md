# First Offer / Первый оффер

A job-search tracker for internships and a first role in IT. This public edition contains fictional examples and no personal CV, account data, application records or production configuration.

## Features

- Vacancy, application and interview views, notes, follow-up dates and CSV/JSON export.
- Internship-first ranking: Data Engineering, Analytics Engineering, Data Analyst, ML, BI, then engineering with a data focus.
- Remote/Hybrid/On-site, country, language, experience and relevance filters.
- Explicit eligibility checks for working from Georgia; Russian remote roles require confirmed cross-border access.
- Editable vacancy-specific CV and cover-letter drafts built from confirmed facts; project selection, change explanations and local PDF export.
- Portfolio fact approval, application checks and short interview practice plans.
- Per-account persistence, optimistic revision checks and backup snapshots in the production Worker.

Ranking is a deterministic aid, not a hiring probability. CV adaptation reorders supplied facts; it does not scrape employer pages or invent qualifications. Source links do not connect GitHub or LinkedIn accounts. The mail button opens a compose request; it does not send email or attach documents.

## Run the local demonstration

Use Node.js 22.13 or newer (Node 24 recommended).

```bash
npm ci
npm run dev
```

Open http://127.0.0.1:3000. The demonstration uses a simulated local identity and an in-memory SQLite database. Restarting the server loses cloud-side demo state; the browser may still retain its local cache. All candidate/project examples are fictional. Replace them in the UI with your own facts only if you want to use this local copy personally.

`server.mjs` binds to loopback only and must not be exposed through a tunnel or deployed. It is a development adapter, not an authentication system.

## Checks

```bash
npm run check
npm test
npm run build:resume-pdf
```

The tests run the actual client modules in JSDOM and the Worker against SQLite. They cover saves/reloads, account isolation, revision conflicts, ranking, geographic eligibility, CV fact approval and PDF generation. This is not browser visual testing.

## Architecture

| Path | Purpose |
| --- | --- |
| `dist/client/` | Browser UI, deterministic ranking, feed merge and CV preparation |
| `dist/server/index.js` | Cloudflare-compatible Worker API and authenticated account isolation |
| `dist/server/demo-*.js` | Fictional example baselines |
| `db/` and `drizzle/` | SQLite schema and migrations; no database contents |
| `server.mjs` | Loopback-only local development adapter |
| `scripts/pdf-entry.js` | Local PDF generation; bundled browser output is included |
| `tests/` | Local integration and rules tests |

The Worker expects a trusted authentication gateway to supply identity headers. Those headers are not an authentication mechanism if clients can supply them directly. Public deployment requires an authentication integration that strips client identity headers, validates the session, and provides trusted identity, plus the logical `DB` and `ASSETS` bindings. Do not deploy the Worker publicly without that boundary.

## Hosting and catalogue updates

This repository is a standalone source edition. It is not connected to the author's private deployment. It contains no production Site IDs, invite lists, secrets or scheduler credentials. Pushing here does not update an existing site.

The included catalogue is fictional. No live search automation or twice-daily update service is installed by cloning this repository. A separate authenticated scheduled process must verify sources, deduplicate roles and publish a validated `feed.json`; see [CATALOGUE.md](CATALOGUE.md).

## Privacy and limitations

- Do not commit personal CVs, application exports, contact lists, credentials or database files.
- Every user should have their own account in a hosted version; shared catalogue data must never contain personal application fields.
- The first-write strategy backup is a snapshot, not a rolling disaster-recovery system.
- PDF export works locally; unsupported glyphs require editing before export.
- No automatic email delivery or mailbox synchronization is implemented.

This project was developed with AI assistance. The public edition is published with a fresh history to exclude private implementation history. Third-party package and font notices retain their own terms; see `THIRD_PARTY_NOTICES.md`. No project-wide redistribution license is assigned in this edition.
