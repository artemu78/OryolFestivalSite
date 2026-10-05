# Identity schema and coordinated migration

Status: implementation contract, 5 October 2026. This document specifies the
new system; it does not claim that the migration has run. Follow the six prompts
in [identity-migration](identity-migration/01-contract.md) sequentially.

## Scope and current evidence

The current API authenticates a VK token and uses `Participants.vkontakte_id`
as both identity and authorization key. `Participants` contains only `admin`
and `note`; public expert names/profiles are separate in `src/experts.json`.
`Events` contains IDs, titles and descriptions. `Attendance` and `Hosts` use
VK IDs. Login does not create records. Expert professional descriptions are
public content, not authorization roles. Attendance is a manually maintained
attendance marker, not a booking or registration workflow. Correct misleading
planned-participation labels while retaining the existing attendance matrix.

No live row inspection was performed during the contract step. A database export
and dry run are mandatory before execution even though there are no active site
users. Existing records may include an operator administrator or seeded events.
Preserve existing modifications to Admin.jsx, Admin.css and programme IDs.
AGENTS.md excludes Татьяна Хотеева: exclude her from imported public experts and
programme references. Record this correction explicitly; do not silently import
her from the current source files.

## Physical schema

All columns are non-null unless marked nullable. Keep the existing Events table
unchanged and retain its IDs. Keep old Participants/Attendance/Hosts tables
protected and untouched for rollback; never change their primary keys in place.

| Table path | Primary key | Remaining columns |
| --- | --- | --- |
| Users | id: Utf8 | vkontakte_id: Int64 nullable; name: Utf8; note: Utf8 |
| VkIdentities | vkontakte_id: Int64 | user_id: Utf8 |
| UserRoles | user_id: Utf8, role: Utf8 | none |
| ExpertProfiles | user_id: Utf8 | photo: Utf8; profile_url: Utf8; professional_title: Utf8; bio: Utf8; sort_order: Int64 |
| AttendanceV2 | user_id: Utf8, event_id: Utf8 | none |
| HostsV2 | user_id: Utf8, event_id: Utf8 | none |
| Events (existing) | id: Utf8 | title: Utf8; description: Utf8 |

Logical Attendance/Hosts in the API refer to the V2 physical tables. No later
rename is required for this release. Terraform protects all identity tables
with prevent_destroy. The explicit VkIdentities map supports unique, indexed
login lookup and guards concurrent VK linking without a nullable unique index.
A VK ID is a positive Int64, serialized as a decimal string in JSON; null means
unlinked. Do not derive IDs from vanity URLs, names or even numeric profile URLs
without an operator-verified mapping. Login requires a linked VK identity.

Roles are only `attendee` and `admin`, represented by separate rows. An expert
profile establishes expert status. These properties overlap independently.
Ordinary known users can have no roles. The private note is never used as a name.
User IDs are immutable, opaque strings; API-created IDs are UUIDs generated once
outside a retryable transaction. Initial migration uses UUID5(namespace `18b1514f-3c43-5e27-a32f-8daf02039c36`, name `vk:<decimal>`)
for participant records and `expert-<portrait-basename>` for unmatched experts.
An explicit operator mapping links a source expert to a migrated user; exact
names are insufficient evidence to merge identities. Validate collisions.

## Transaction invariants

Every authenticated operation resolves VkIdentities -> Users, checks consistency
of the duplicated VK field and reads admin role in the same SerializableReadWrite
transaction as the operation. Deny mutations by unknown or non-admin identities.
Use SDK retry handling; do not retry side effects outside the database. All writes
including scripts must enforce the following:

- A populated Users.vkontakte_id has exactly one matching VkIdentities row.
  Read/check the new mapping before writing, reject ownership conflicts (409),
  and atomically remove an old mapping and write the user/new mapping.
- UserRoles and ExpertProfiles require a user. Roles reject unknown values.
- AttendanceV2 requires an existing event and attendee role; HostsV2 requires an
  existing event and expert profile. Check these when enabling a link. Disabling
  a link may remove a stale record safely and does not create its endpoints.
- Removing attendee role deletes that user's attendance markers atomically.
  Deleting an expert profile with host links returns 409: explicitly remove links
  first. Deleting a user cascades roles, profile, identity, attendance and hosts.
- Deleting an event cascades both link tables. Unknown deletion targets return
  404. Do not introduce automatic programme synchronisation.
- An administrator cannot delete their own user, remove their own admin role,
  or unlink/change their own VK identity. Granting admin requires a consistent linked VK identity. Any administrator must
  be demoted before unlinking VK. Removing another administrator checks
  that at least one remains. Read the admin-role range inside the transaction
  before deletion/demotion to guard concurrent removals.

YDB relationships are enforced by this application, not SQL foreign keys.
Serializable transactions make the read/check/write sequence atomic; rollback
on validation failure. Primary-key ownership checks prevent VK-map overwrites.

## API contract

Keep POST JSON `{action, ...fields}`, the existing X-VK-Token Bearer header,
VK verification, CORS, in-memory browser credentials and no-store responses.
Use field validation and explicit allowlists, not user-controlled table names.
Status: 400 invalid request/protected self-operation; 401 invalid VK token;
403 non-admin management; 404 missing target; 409 relationship/identity conflict;
503 infrastructure failure. Do not disclose raw database exceptions.

| action | Request fields | Response |
| --- | --- | --- |
| me | none | user_id: string/null, vkontakte_id: string, name: string/null, attendee: boolean, admin: boolean, expert: boolean |
| list | none | users, roles, expert_profiles, events, attendance, hosts arrays |
| saveUser | optional id; vkontakte_id: string/null; name; note | ok: true, id |
| deleteUser | id | ok: true |
| saveRoles | user_id; roles: array of attendee/admin | ok: true |
| saveExpertProfile | user_id; photo; profile_url; professional_title; bio; sort_order | ok: true |
| deleteExpertProfile | user_id | ok: true |
| saveEvent | optional id; title; description | ok: true, id |
| deleteEvent | id | ok: true |
| attendance / host | user_id; event_id; enabled: boolean | ok: true |

`list.users` rows expose id, nullable vkontakte_id, name, note; roles expose
user_id/role; profiles expose all profile columns; links expose user_id/event_id.
Private arrays are administrator-only. New users require nonempty name; migrated
unnamed legacy users use the transparent placeholder `Участник VK <id>` until
edited, retaining note separately. Suggested maximum lengths: ID 100, name 300,
note 4000, title 300, description/bio 10000, photo 500, profile_url 1000,
professional_title 500. sort_order is a nonnegative integer within Int64.
Photo must be a safe relative existing path under public/ (no traversal); profile
URL must use https. No upload feature is added. Reject duplicate roles and invalid
booleans/types. saveUser creates only identity; roles/profile use explicit actions.
Registered attendee UI uses attendee, never merely user existence. The auth SDK's
external user_id should be kept distinctly named from this internal user_id.

## Migration, validation and rollback

1. Prepare new tables and code locally, retaining old tables and function version.
   Add a deployment maintenance flag checked for all API mutations, including
   scripts' operator discipline; reads may remain available. Seed only missing
   events and explicitly requested administrator, preserving existing fields.
2. Freeze writes on the old API before the definitive export. Export every row
   of all four old tables with a manifest/counts and save privately outside Git.
   A preliminary export/dry run can precede the freeze but is not authoritative.
3. Dry-run deterministically translates participants (all gain attendee; original
   admin=true also gains admin), notes, events and attendance. Import approved
   expert content in source order and use explicit identity mapping where given.
   Report every legacy host whose user lacks a mapped expert profile. Do not
   manufacture expert biographies, drop hosts or auto-merge; block execution
   until unresolved hosts/duplicates/orphans are corrected explicitly.
4. Apply imports in an atomic transaction for this small festival, preserving
   Events and excluding the prohibited expert. A repeat run compares expected
   rows and never overwrites divergent administrator edits. Reject conflicts,
   rather than silently resetting state. No old table is deleted or mutated.
5. Validate counts, identity-map bijection, approved experts/order, preserved
   event IDs and notes/admin flags, link endpoint existence, role/profile link
   eligibility, no duplicate VK IDs and at least one verified admin. Export public
   expert JSON; build root and Pages variants; deploy API and frontend together.
6. Unfreeze only after live checks. Verify admin login/actions with an actual
   operator token when available. Missing tokens mean authenticated checks remain
   unverified, not passed. Keep the old tables/export and old function version.

Before writes resume, rollback restores the prior function version and static
build; old tables still contain the frozen snapshot. After new writes resume,
freeze again and export the new system before rollback: reconcile those writes
explicitly. Blind rollback to old tables would lose new changes and is forbidden.
Removal of protected legacy tables is a separate cleanup after verification.

## Public expert delivery

Expert profiles in YDB are authoritative after cutover. A credentialed operator
export produces only id, name, photo, profile, role and text in src/experts.json,
ordered by sort_order then internal ID. Never export VK IDs, notes, permissions
or attendance. Check generated output into Git so builds need no cloud secrets.
Keep a stable public expert ID (the internal user ID) and change programme people
references to these IDs. Existing numeric programme event IDs remain untouched;
these are separate from expert IDs and existing Events IDs. Export does not change
public schedule content. Changing names no longer breaks programme references.
Expert edits require export, rebuild and publishing both deployment paths.

## Documentation evidence

Context7 resolved `/ydb-platform/ydb` (official, high-reputation source) and fetched
SerializableReadWrite transaction examples from the official
[transaction control recipe](https://github.com/ydb-platform/ydb/blob/main/ydb/docs/en/core/recipes/ydb-sdk/tx-control.md).
The retrieved results did not document foreign-key or nullable-uniqueness support;
this contract therefore relies on explicit application checks and a primary-key
identity map rather than claiming database enforcement. Implementation steps must
consult focused current SDK/provider documentation for the syntax they use.
