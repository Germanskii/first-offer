# Catalogue contract

The shared catalogue lives in `dist/client/feed.json`. Only factual vacancy data belongs here: stable ID, company, position, role, format, country/city, source/direct URL, stated stack/experience/languages, compensation when disclosed, availability, publication date, deadline and verification date.

Never include personal notes, contacts, application statuses, CVs, cover letters, interview history, user profiles or private portfolio facts. Run `npm run check` after editing. Keep stable IDs and original discovery timestamps; deduplicate by canonical URL and employer/position/location across sources. Do not fabricate vacancies or verification timestamps.

Search priority is Internship, then Trainee/Graduate/Entry Level, then Junior/0–1 year. Professions: Data Engineering, Analytics Engineering, Data Analyst, ML, BI, Engineering with Data Focus. Prefer Remote, Hybrid, On-site; then language fit, technical fit and experience. Partial internship stack matches remain worth reviewing.

Search Georgia, Armenia and Europe; worldwide remote requires explicit Georgia eligibility. Russian companies outside Russia can qualify normally; Russia-based companies require permanent remote work from Georgia without Russia-presence requirements. Record uncertainties in `remoteEvidence`, `requiresRussiaPresence` and `russiaEmploymentRisk`. Do not imply legal employment eligibility from a remote label.

`publicationDate` is the employer-stated date, not the discovery date. `lastSignificantChange` is used only after substantive changes, not every check. Unknown values remain empty or explicitly unknown. If a source cannot be checked, retain the previous verification date. A scheduler and publication service are separate infrastructure and are not included in this repository.
