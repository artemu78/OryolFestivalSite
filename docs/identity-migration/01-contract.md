# Step 1 — Schema and migration contract

## Implementation prompt

Plan the identity/schema migration and save it in `docs/identity-schema.md`. Read AGENTS.md, architecture, Terraform tables, admin API/tests, authentication and expert/programme data. Do not deploy or change application behaviour.

Design Users(id, optional vkontakte_id, name, note), UserRoles(user_id, role: attendee/admin), ExpertProfiles(user_id, photo, profile_url, professional_title, bio, sort_order), and Attendance/Hosts using user_id. Keep Events IDs and fields. Expert profile existence establishes expert status; hosts require a profile; roles overlap. Preserve registered-attendee semantics.

Define YDB types, transactionally enforced relationships and populated VK-ID uniqueness, API contracts, deletion/admin protections, migration order and rollback. No active users require uninterrupted service: use a coordinated cutover. Inspect existing records before migrating; do not guess VK IDs or erase data. Follow AGENTS.md exclusion of Татьяна Хотеева despite the current JSON entry. Use Context7 for YDB-specific documentation.

Preserve pre-existing changes in Admin.jsx, Admin.css and program.json. Report checks, decisions and unresolved mappings. Do not commit or push.

## Result

Implemented in [the schema contract](../identity-schema.md). The contract defines
V2 link tables, a VkIdentities ownership map, explicit API actions, deterministic
migration IDs, overlap of roles/profile status, validation, coordinated cutover
and rollback. Live records have not yet been inspected; step 2 must provide the
export/dry-run and unresolved-host report before cloud execution.
