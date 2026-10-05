# Identity migration operations

New tables are in `infra/yandex/identity.tf`; old tables and Events stay untouched.
Terraform must create the new tables before execution. Review its plan; do not
apply a table replacement or delete protected legacy resources.

Use the installed Python runtime with the pinned admin requirements. Set
`YDB_ENDPOINT`, `YDB_DATABASE`, and `YC_SERVICE_ACCOUNT_KEY_FILE` through your
local operator environment. Do not commit credentials or exported rows.

Run a preliminary read-only export and dry run:

```sh
python infra/yandex/migrate-identities.py --backup /private/tmp/festival-legacy-preflight.json
```

Backups use mode 0600, must be outside this repository, and must have a new file
name each run. They contain all four old tables plus counts. Move authoritative
backups to private durable storage; temporary directories are not durable.
Dry run does not require the new tables to exist. It blocks invalid IDs,
duplicate identities/keys, orphan links, missing portraits, absence of a legacy
admin, and unresolved hosts. It prints counts only.

When a legacy host needs an expert identity, supply an operator-verified private
mapping file: JSON object with portrait basename (without extension) as key and
legacy numeric VK ID as value. Do not match by name or infer IDs from URLs.
Pass `--mapping /private/path/verified-expert-mapping.json` to both modes.

For coordinated cutover, enable maintenance and freeze all old API/script writes.
Create a fresh definitive export and atomically import:

```sh
python infra/yandex/migrate-identities.py --backup /private/path/festival-legacy-cutover.json --execute --writes-frozen
```

`--writes-frozen` is an operator assertion, not a remote maintenance switch.
The execution transaction rechecks the frozen legacy snapshot, checks all new
rows against the deterministic import, inserts only missing rows, and verifies
again before committing. Exact repeat execution is safe; divergent edits or
unexpected target rows block the transaction. Events and legacy tables are never
written. A fresh backup filename is still required for repeats.

`seed-admin.py --admin-id <verified-id>` now seeds the new Users/VkIdentities/
UserRoles schema, grants only admin, and seeds only missing Events. Existing
names/notes/events are preserved. Run it only after new tables exist and under
the same operator maintenance discipline. Do not use it before legacy migration
to silently replace preexisting identity records. New admin seeding is an explicit
role assignment; it does not register an attendee.

Retain old tables, backups, function version and frontend build. Before resuming
writes, rollback selects the old function/build. After resuming writes, freeze
and export the new system and reconcile new writes before rollback. Never blindly
switch back to the old frozen records. See `docs/identity-schema.md`.

After deployment or later edits, run `python infra/yandex/migrate-identities.py
--verify-only` with operator environment credentials. This read-only mode checks
identity bijection, VK uniqueness, valid roles, at least one linked administrator,
profile endpoints and attendance/host eligibility without expecting pristine
migration rows. It prints only counts; it does not need a backup path.
