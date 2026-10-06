# Step 5 — Public expert export

## Implementation prompt

Make YDB the source of truth for expert profiles while retaining static delivery. Add a controlled build-time public JSON export from Users/ExpertProfiles. Export only approved public fields, excluding VK IDs, notes, roles and attendance. Never expose credentials in the browser.

Use stable internal expert IDs in public data and replace programme name references with IDs in experts.js and program.json. Preserve current programme content, order, portraits, links and layout; respect AGENTS.md expert exclusion. Validate missing experts/photos. Keep event scheduling in program.json.

Document export/rebuild/publication after expert edits; implement reproducible generation/validation. Verify root and Pages builds and desktop/mobile rendering. Preserve pre-existing programme edits. Use Context7 where applicable. Do not deploy, commit or push.

## Implementation evidence — 5 October 2026

Completed locally. `infra/yandex/export-public-experts.py` provides explicit public
projection, consistent YDB reads, truncation checks and validation before atomic
file replacement. `experts-seed.json` is the immutable approved migration input;
the checked-in public file is a deterministic bootstrap snapshot of 13 profiles,
not yet a live YDB export. Step 6 must re-export live tables before publishing.
Programme people references now use stable IDs; event IDs 1–15 and other event
content are preserved. Татьяна Хотеева was removed from profiles and references
as instructed. Legacy identities use deterministic opaque UUID5 IDs rather than
VK-containing strings; public export rejects VK-placeholder names and legacy
VK-containing IDs. Migration and seed tools use the same documented namespace.

Seven public-export tests and seven migration tests pass. Root and GitHub Pages
builds pass, including public privacy/reference/photo validation before build;
`git diff --check` passes. Desktop 1440×1000 and mobile 390×844 browser checks
show 13 experts, 15 programme cards, no page errors; screenshots saved privately
in `/private/tmp/festival-step5-1440.png` and `festival-step5-390.png`. Existing
mobile horizontal overflow comes from decorative `.video-orbit` SVG, not changed
expert/programme content; left unchanged as unrelated. Expert layout was viewed
on mobile and retains the existing two-column layout. No cloud writes, deployment,
commit or push performed. See [operator instructions](../public-expert-export.md).

Context7 resolved the official `/ydb-platform/ydb-python-sdk` and retrieved
transaction/retry and service-account credential documentation for the exporter.
