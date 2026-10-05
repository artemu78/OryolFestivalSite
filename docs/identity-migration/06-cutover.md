# Step 6 — Coordinated cutover

## Implementation prompt

Deploy the completed migration using the schema and deployment docs. Run backend/migration tests, root/Pages builds and diff checks. Review Terraform plan and create a recoverable private export before changes. Prevent admin writes during cutover; create tables, migrate, verify identities/roles/relationships, then deploy matching backend/frontend.

Verify admin login, attendee recognition, expert edits, host assignment, denied non-admin mutations and public programme/portraits. Publish both Yandex copies and GitHub Pages through their own paths. Separate local and live evidence; do not claim checks requiring unavailable user credentials were performed.

Update architecture/editing/deployment docs. Retain old tables through live verification; cleanup is separately reviewed. Keep secrets, private backups, plans and state out of Git. Commit and push completed code/docs while preserving and identifying pre-existing edits. Use Context7 for relevant tools/cloud documentation. If deployment is blocked, complete unaffected work and report the precise blocker with rollback state.

## Result — 2026-10-05

Complete: six tables created; frozen legacy snapshot migrated; live SQL operations
and integrity verified; live public profiles exported; both Yandex bucket copies
published; writes resumed. Legacy tables remain protected. See
[deployment evidence](../../infra/yandex/DEPLOYMENT.md) and
[operator rollback guidance](operations.md).

31 tests, both builds, whitespace checks and final no-drift Terraform plan passed.
Real owner VK login was unavailable; authenticated SQL checks and HTTP
credential-denial/CORS checks are recorded separately. Cyrillic custom-domain
readiness is not confirmed although its direct bucket content is verified.

Implementation committed and pushed to main (`b592b90`); GitHub Pages deployment
is tracked at https://github.com/artemu78/OryolFestivalSite/actions/runs/37372760764.
The workflow was queued at the time this record was saved; live deployment
completion must be checked independently.
