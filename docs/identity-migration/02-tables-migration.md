# Step 2 — Tables and migration tooling

## Implementation prompt

Implement `docs/identity-schema.md` without applying cloud changes. Add Terraform tables, using replacement Attendance/Hosts paths where primary keys cannot safely change in place. Preserve deletion protections.

Create dry-run and explicit execution migration modes. Export old records for rollback; migrate Participants into Users/UserRoles preserving admin flags and notes; translate Attendance/Hosts using a stable ID map. Import expert profiles in display order, excluding Татьяна Хотеева. Do not infer numeric VK IDs from vanity URLs or merge people by name alone; report unresolved identity/host mappings.

Verify counts, duplicate VK IDs, orphan relationships and repeat execution. Update seed-admin.py, preserve Events IDs, add meaningful migration tests and deployment instructions. Use Context7 for library/cloud specifics. Preserve existing user edits. Do not deploy, delete old tables, commit or push.

## Completion evidence

Implemented protected Users/VkIdentities/UserRoles/ExpertProfiles/AttendanceV2/
HostsV2 Terraform resources, private legacy export plus deterministic dry-run and
atomic explicit migration, conflict-safe repeat checks, and new-schema admin seed.
Operational instructions: [operations.md](operations.md). Legacy tables and Events
are not mutated by migration. No cloud writes, deploy, commit or push performed.

Seven focused migration tests pass (preservation, explicit expert matching, excluded
expert, duplicate/orphan/admin checks, repeat/divergence). Terraform formatting
and `git diff --check` pass. SDK 3.33.2 Python transaction APIs were checked through
Context7 `/ydb-platform/ydb-python-sdk`.

Live preliminary export was attempted read-only using local authorized key/state;
it failed with ConnectionFailure in the restricted environment, before any backup
was written. Live counts and unresolved hosts remain unverified. Terraform validate
could not load existing provider plugins under the sandbox; validation and live
read-only export must be retried with appropriate environment access before
cutover. These are verification limits, not permission to skip definitive export.
