# Deployment status — 2026-10-05

Cloud infrastructure deployed in folder `b1g5fdg0o0t57rnfm9j4`.

- Site buckets: `mentalhealthfestival.ru` and
  `xn--80aaecegccue9ackpcqbca3bewh1b5qgk8f.xn--p1ai`.
  Each contains 37 public site files; macOS metadata is excluded.
- Cloud DNS zones: `dns4vbip59lhn11kmnmd` (Latin domain) and
  `dns0rvbb5q47u2h625tp` (Cyrillic domain).
- Managed certificates: `fpqfgiufdejok8ohk81k` and `fpq1904g9hep0su4j5s6`.
  Requested; their permanent validation CNAMEs exist in Cloud DNS.
  Latin certificate is ISSUED and attached to its bucket on 2026-10-05.
  The Cyrillic certificate remains VALIDATING. Local configuration uses
  `https_domain_keys = ["latin"]`; `enable_https = false` until both are ready.
  Immediately after attachment the HTTPS endpoint still served its default
  certificate; propagation is pending. Public HTTP serves the festival HTML.
- Public function: <https://functions.yandexcloud.net/d4eggj7dcf05pjql58q6>.
- Serverless YDB: `etn7ekpandgki16i7ui1`, table `messages`.
- Runtime service account: `ajee01lqollvieq2371s`, with database-scoped `ydb.editor`.

Verified live: both index pages return HTML; desktop/mobile videos return
`video/mp4` and support byte-range requests; GET/POST/GET proves the function
writes and reads `Hello world` through YDB. Final Terraform plan reports no changes.
Local build, Terraform validation, formatting and diff whitespace checks passed.

## Required next step

Set nameservers at REG.RU for BOTH registered domains:

```text
ns1.yandexcloud.net
ns2.yandexcloud.net
```

Check the registrar's full zone for any mail/subdomain records and DNSSEC DS records
before delegation. Public root lookups returned NXDOMAIN at the time of deployment;
this does not establish that the registrar has no unpublished records.

After delegation propagates and certificates are issued, set `enable_https = true`
in the ignored local `terraform.tfvars`, then plan and apply as documented in README.md.
Verify both custom HTTPS domains and their video assets afterward.
No registrar changes were made by the agent. No repository commit or push was made.

## Identity cutover — 2026-10-05

Completed six sequential implementation steps in `docs/identity-migration/`.
Six new protected tables created: Users, VkIdentities, UserRoles, ExpertProfiles,
AttendanceV2, HostsV2. Legacy tables and all 15 Events retained unchanged.
Migration imported 15 users, 2 VK mappings, 4 roles, 13 expert profiles and
1 attendance link; zero host links existed. No expert VK identity was guessed.

Maintenance: deployed the new API with mutations disabled, drained the old
30-second timeout, then exported/migrated the frozen old records transactionally.
Private durable rollback artifacts (legacy export, state, local variables,
old archive/source/dist) are outside the repository in the owner's
`MyLocalDocuments/festival_mental_health-backups/20261005-identity-cutover`.
Old function version: `d4ehmcn0ncthc1f90vtk`; final version:
`d4eseh6mhmqguoc15lrk`. Final ADMIN_WRITES_DISABLED is false.
After resuming writes, rollback needs a new freeze/export and reconciliation;
never switch blindly to the old frozen tables. Legacy cleanup remains separate.

Validation: 17 backend + 7 migration + 7 public export tests passed; root and
GitHub Pages builds and whitespace checks passed. Real YDB SQL smoke passed
nullable Optional<Int64> creation, duplicate VK denial, overlapping roles,
attendee recognition, profile creation/edit, eligible host assignment,
profile deletion protection, maintenance rejection and non-admin denial.
Disposable user/event/profile/links were removed and integrity verification
returned the original migrated counts. SQL smoke used operator credentials;
it does not establish real VK-authenticated browser login.

Deployed public API rejected missing and invalid VK tokens with 401; allowed
Latin origin OPTIONS returned 204 and the expected CORS origin. Owner VK login,
redirect flow and authenticated HTTP admin editing remain unverified because
no real user token was available. They do not block write resumption.

Exported all 13 public profiles from live YDB before building/publishing.
Both Object Storage copies have exact HTML/JS/CSS hashes matching the root build;
Latin custom HTTPS and HTTP also match. Cyrillic direct storage endpoint works,
but the custom domain resolves to registrar parking (A 95.163.244.138).
Latest HTTP/HTTPS responses both returned 200 from openresty with REG.RU parking
content, not the festival. Existing DNS/certificate configuration was preserved;
custom-domain readiness remains a separate unresolved deployment limitation.

Final full Terraform plan reports no changes. No secrets, private exports,
local state or plans are committed. Preserved the preexisting admin matrix/CSS
and numeric programme IDs while integrating the shared identity schema.

Implementation commit `b592b90c601a8cf2e406baddf34525272ee173e4` was pushed to
main; Pages workflow: https://github.com/artemu78/OryolFestivalSite/actions/runs/37372760764.
Workflow was queued when this deployment record was saved. Verify its completion
and the latest documentation commit's workflow before treating Pages as published.
