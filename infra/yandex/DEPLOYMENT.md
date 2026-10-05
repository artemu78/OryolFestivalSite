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
