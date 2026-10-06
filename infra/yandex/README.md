# Festival hosting on Yandex Cloud

Infrastructure for `mentalhealthfestival.ru` and `фестивальментальногоздоровья.рф`
in folder `b1g5fdg0o0t57rnfm9j4`. The IDN's ASCII name is
`xn--80aaecegccue9ackpcqbca3bewh1b5qgk8f.xn--p1ai`.
Both domains serve the same festival site. Domain registration stays at REG.RU.

## Resources

- Two Object Storage website buckets (one per domain), each limited to 1 GiB.
  Public object reads are enabled; public listing and configuration access are disabled.
- Two managed HTTPS certificates, validated with permanent CNAME records.
- Optional public Cloud DNS zones, ANAME website records, and validation CNAMEs.
- One serverless YDB database and one row table, `messages` (`id`, `message`).
- One Python 3.12 function, public via its standard HTTPS invocation URL.
  Its runtime service account has `ydb.editor` on this database only.
  No runtime credential files or static access keys are generated.

The site is served directly from Object Storage. Its video assets must not be
proxied through API Gateway, which has a 2.5 MB request/response limit.
The existing GitHub Pages workflow is retained. It does not deploy to Yandex Cloud.
The site includes an admin page using a separate VK-verified API; the demo function remains independent.

The function is a public demo: GET reads row `hello`; POST writes `Hello world`
to that row and reads it back. Request bodies are ignored, and callers cannot
choose a row or stored value. CORS permits the two HTTPS site origins.
CORS does not restrict non-browser callers. GET performs no write.
Scaling is limited to one instance and five concurrent requests per zone;
these are concurrency controls, not a daily spending cap. YDB is configured
with throttling at 10 RCU/s, zero provisioned RCU, and a 1 GB storage limit.
Usage may incur charges. Buckets, table, database and certificates have deletion
protections; deliberate removal requires reviewing and disabling those protections.

## Credentials and local state

Use a Yandex service-account authorized JSON key outside version control:

```sh
export YC_SERVICE_ACCOUNT_KEY_FILE="$PWD/infra/yandex/authorized_key.json"
```

Alternatively supply `YC_TOKEN` locally. Never paste credentials into chat or
commit them. The provisioner needs permissions to create and manage the listed
resources and assign service-account roles in the supplied folder. It must be
able to create the YDB table through the database data API, in addition to
managing YDB through the control API, and attach a service account to a function.

The authorized key, local tfvars, provider downloads, state, saved plans and
function archive are ignored. Keep the state and its backups private and preserve
them: they identify the resources managed by this configuration. This setup uses
local state; configure a private remote backend before sharing management across
machines. The provider lock file is tracked. Do not delete state to retry a failed apply.

## First deployment

Build the site with root-relative URLs, then initialize Terraform:

```sh
PAGES_BASE_PATH=/ npm run build
cp infra/yandex/terraform.tfvars.example infra/yandex/terraform.tfvars
terraform -chdir=infra/yandex init
terraform -chdir=infra/yandex validate
```

Set `manage_dns = true` in local `terraform.tfvars` when using Yandex Cloud DNS.
Leave `enable_https = false` for the initial apply. A separate HTTPS stage prevents
Terraform from waiting for registrar changes before outputting DNS instructions.

```sh
terraform -chdir=infra/yandex plan -out=initial.tfplan
terraform -chdir=infra/yandex apply initial.tfplan
terraform -chdir=infra/yandex output
```

Before delegation, inventory all existing DNS records (including mail, verification
records, subdomains and DNSSEC). Public lookups of the root alone cannot reveal
the whole zone. Copy any required existing records to the new Cloud DNS zones.
If a DNSSEC DS record exists at the registrar, coordinate its removal or replacement
before changing nameservers to avoid broken resolution.

For **both domains** set these nameservers at REG.RU:

```text
ns1.yandexcloud.net
ns2.yandexcloud.net
```

Cloud DNS already contains the root ANAME and certificate-validation CNAME records.
Retain the CNAMEs for automatic certificate renewal. Domain registration is not transferred.
After delegation propagates and both certificates are issued, set
`enable_https = true` in local `terraform.tfvars`:

```sh
terraform -chdir=infra/yandex plan -out=https.tfplan
terraform -chdir=infra/yandex apply https.tfplan
```

If retaining external DNS instead, use `manage_dns = false` and publish the outputs
`certificate_dns_records` and `website_dns_records` with your authoritative provider.
Root website records require ANAME/ALIAS support; do not create a root CNAME or
pin a transient Object Storage IP. If your DNS host cannot support apex aliases,
use Yandex Cloud DNS or choose another hosting design.

## Verify and update

### Browser cache headers

Terraform manages cache headers for both website buckets. Hashed JS/CSS in
`assets/` gets `public, max-age=31536000, immutable`; images, video and fonts
get `public, max-age=2592000`; HTML and other files get `no-cache`.
Local media URLs include a content hash query parameter computed at build time.
After replacing a file in `public/`, rebuild and publish the app as well as the
file. Do not replace media manually without rebuilding its URL manifest.
External sponsor images and GitHub Pages headers are outside this policy.

Yandex provider 0.235.0 has no `cache_control` object argument. The built-in
`terraform_data.site_cache_headers` resource runs `set-cache-headers.mjs` after
uploads. It requires Node.js 22+ and the same `YC_TOKEN` (IAM or Yandex OAuth) or
`YC_SERVICE_ACCOUNT_KEY_FILE` environment as the provider. Key paths must be
absolute, as the provisioner runs from `infra/yandex`. No extra npm packages,
CLI installation, static S3 keys, or UI steps are needed.

The script copies objects onto themselves using the S3 API, preserves existing
content/custom metadata, guards the copy with the current ETag and verifies
Cache-Control and unchanged ETag afterwards. Tokens are never printed or saved
to Terraform state. Uploads or script/policy changes rerun it; unchanged headers
are skipped. A failed step fails the apply and is retried on the next apply.
Individual requests retry transient connection/DNS/timeouts and HTTP 408/429/
500/502/503/504 up to four attempts, with 1/2/4-second backoff. Response body
reads are included in the retry boundary; repeated copies keep the same ETag
precondition. Errors identify the method, host/path, HTTP status or underlying
network error code and attempt count, without printing credentials or bodies.
Authentication/permission errors and certificate failures are not retried.
Out-of-band header drift is not detected by plan; repair it with a reviewed plan
using `-replace=terraform_data.site_cache_headers`.

Run `node --test scripts/cache.test.mjs` for local regression checks. After apply,
verify live headers for HTML, a hashed JS asset and a versioned image/video on
both domains. This policy improves repeat visits; it does not shrink first-load
images or control third-party caching.

### Site and API checks

```sh
curl -fsS "$(terraform -chdir=infra/yandex output -raw function_url)"
curl -fsS -X POST "$(terraform -chdir=infra/yandex output -raw function_url)"
curl -fsS "$(terraform -chdir=infra/yandex output -raw function_url)"
curl -I https://mentalhealthfestival.ru/
curl -I https://xn--80aaecegccue9ackpcqbca3bewh1b5qgk8f.xn--p1ai/
```

Verify that POST reports `written: true` and a subsequent GET reports
`stored_message: "Hello world"` and `written: false`. Also verify the
video assets return `video/mp4` and support normal playback in a browser.
Until domain validation and HTTPS attachment finish, custom HTTPS URLs are not ready.

For site updates, rebuild with `PAGES_BASE_PATH=/`, then plan and apply. Terraform
uses file checksums to upload changed assets and removes previously managed assets
no longer present in the build. Keep both domains and `manage_dns` unchanged unless
intentionally migrating them. No automatic Yandex deployment workflow is configured.

## Sources

Configuration was checked against Yandex provider `0.235.0` documentation through
the configured HashiCorp Terraform MCP server and against Yandex docs through Context7.

- [Object Storage custom domains](https://yandex.cloud/en/docs/storage/operations/hosting/own-domain)
- [Object Storage HTTPS](https://yandex.cloud/en/docs/storage/operations/hosting/certificate)
- [API Gateway limits](https://yandex.cloud/en/docs/api-gateway/concepts/limits)
- [Cloud Functions connection to YDB](https://yandex.cloud/en/docs/functions/tutorials/connect-to-ydb)
- [Yandex Terraform provider](https://registry.terraform.io/providers/yandex-cloud/yandex/0.235.0/docs)

## Admin API and event seed

`admin.tf` retains protected legacy tables and deploys the VK-verified function.
`identity.tf` adds Users, VkIdentities, UserRoles, ExpertProfiles, AttendanceV2 and HostsV2.
Events IDs remain unchanged. Build with `VITE_ADMIN_API_URL` set to the
`admin_api_url` output (the current URL is also the application default).

See [identity schema](../../docs/identity-schema.md),
[migration operations](../../docs/identity-migration/operations.md) and
[public expert export](../../docs/public-expert-export.md).

`admin_writes_disabled=true` deploys maintenance mode: reads remain allowed,
mutations return 503 after authorization. For legacy cutover, first deploy the new
API with this flag, wait at least the old function timeout (30 seconds) for existing
calls to finish, then take the definitive legacy export and migrate. Do not treat
`--writes-frozen` as a remote switch. Resume writes with a reviewed plan setting
`admin_writes_disabled=false`, after migration and integrity checks.

Operator scripts require pinned `ydb[yc]==3.33.2`, `YDB_ENDPOINT`,
`YDB_DATABASE`, and `YC_SERVICE_ACCOUNT_KEY_FILE`. `seed-admin.py --admin-id`
assigns the new admin role only to an explicitly verified numeric VK identity;
it preserves names, notes and existing Events. Do not seed before legacy migration.

Register exact HTTPS site base URLs in the VK application's redirect settings.
No VK secret belongs in the static site. Real VK login must be verified separately
with an owner session; SQL/API transport checks cannot establish that browser flow.

After expert edits: export live public profiles, validate, build for `/`, review/apply
Terraform to both buckets, then commit/push for the separate GitHub Pages workflow.
Never publish bootstrap after admin editing. Preserve legacy tables and private
rollback artifacts; after writes resume rollback requires freezing/exporting the
new system and reconciling new changes, not blindly restoring the old snapshot.

## Programme import into Events and HostsV2

`migrate-program.py` imports every field from `src/program.json`. Existing event
keys remain `program-01` … `program-15`; the JSON numeric ID is `program_id`.
`text` maps to the existing `description` column. Additional nullable columns
are `time_start`, `time_end` (Timestamp), `category`, `tag`, `location`, `access`, `background`, `program_id`
(Int64) and `sort_order` (Int64, zero-based JSON array order). Missing optional
values become NULL. Nullable columns remain compatible with the admin API,
which currently edits only event title/description.

Each `people` entry must exactly match `Users.id` and have an `ExpertProfiles`
record. The importer stores one `(event_id, user_id)` pair in `HostsV2`;
this two-column relation stores membership, not the array's display order.
The existing static JSON retains display order and continues to feed the public
page. Importing the database does not publish the site or change its data loader.

With the same operator environment and Python requirements as above:

```sh
python infra/yandex/migrate-program.py
python infra/yandex/migrate-program.py --execute --backup /private/path/program-before-import.json
```

Dry-run reads and validates without writes. Execution first saves Events and
HostsV2 to a new private backup outside the repository, then adds only missing
nullable columns in place (also declared in `admin.tf`). Schema changes are
separate from the data transaction; on import failure, new columns may remain.
It imports and verifies all event fields and host links in one serializable
transaction, rechecking user/profile existence there. Unexpected concurrent
Events/HostsV2 edits abort the import; rerun with a fresh backup. Exact repeat
execution is safe. Missing mapped events are inserted; unrelated rows remain
unchanged. Conflicting existing host links block execution instead of being
silently removed. No users, roles, profiles or attendance records are modified.
Keep the backup for rollback; restore only after reconciling subsequent edits.

### Event timestamps

`Events.time_start` and `Events.time_end` are nullable YDB `Timestamp` columns.
The source clock values belong to **10 October 2026, Europe/Moscow (UTC+03:00)**;
for example, `11:30–11:50` becomes `2026-10-10T08:30:00Z` to
`2026-10-10T08:50:00Z`. A single `18:30` becomes start `15:30:00Z` with NULL end;
no duration is inferred. Missing legacy time becomes two NULLs. Malformed,
reversed or zero-length ranges abort conversion. The pinned Python SDK uses UTC
epoch microseconds for these Timestamp values by default.

To migrate an existing `time` column, use the operator environment above:

```sh
python infra/yandex/migrate-event-times.py
python infra/yandex/migrate-event-times.py --execute --backup /private/path/event-times-before.json
```

Run under exclusive operator ownership of schema/time writes; the current admin
API does not write these fields. The script backs up Events, adds timestamps,
backfills from **live Events.time**, checks all row values transactionally and
again after commit, then drops `time` and verifies the final schema and data.
DDL is separate from the data transaction. If interrupted, repeat with a fresh
backup; conflicting non-NULL timestamps block execution. If `time` is already
absent, it verifies the replacement types and reports already migrated.
Run this script **before** applying Terraform's column removal: Terraform alone
does not migrate values. `migrate-program.py` now converts JSON time strings to
timestamps directly and never recreates the old database column. Static JSON
and the site's display format remain unchanged.

## Sponsors

`sponsors.tf` adds the protected `Sponsors` table with `id`, `name`, `image`,
`link` (Utf8) and `display` (Bool). Deploy the table first, then run with the
operator environment above:

```sh
python infra/yandex/seed-sponsors.py
python infra/yandex/seed-sponsors.py --execute
```

The importer generates stable UUIDs for every image in `public/logos`, sets empty
name/link and display=true, inserts only missing images, and verifies the entire
Sponsors result in one transaction. Existing edits and hidden rows survive repeat
imports. Deploy `festival-admin` after seeding: public `list.sponsors` returns only
visible rows. Rebuild/publish the frontend once to switch to the dynamic gallery;
subsequent row edits need only a page refresh. See [editing sponsors](../../docs/editing-sponsors.md).
