# Step 4 — Admin UI and login state

## Implementation prompt

Update admin-api.js, AuthContext, Header, ParticipantWelcome and Admin to the new API. Separate public name from private note; manage attendee/admin roles and expert profiles. Derive expert status from profile existence. Limit host selection to experts and attendance controls to attendees. Participant greetings require attendee status.

Keep VK IDs as strings, in-memory tokens, server authorization, Russian UI, visible focus, keyboard accessibility and mobile layout. Provide clear errors and destructive confirmations. No self-service, booking, sales or automatic registration. Preserve pre-existing Admin.jsx/Admin.css changes, including their layout intent.

Run build, diff checks and desktop/mobile visual verification. Use Context7 for relevant library/API specifics. Do not deploy, commit or push.

## Completion — 5 October 2026

Implemented the new users/roles/expert-profile API in Admin, preserving the
attendance matrix and mobile scrolling. Attendance now means actual attendance;
only attendees appear in the matrix and only experts have host controls. Name
and private note are separate. VK IDs remain strings. Administrator grants
require a linked VK identity; protected own operations are disabled, and other
administrators must be demoted before their VK identity changes. Destructive
operations request confirmation; expert deletion with host links explains the
required cleanup. Portrait selection uses the backend's allowed-photo list.

Auth distinguishes SDK `vk_user_id` from internal `user_id`, derives attendee
welcome from `me.attendee`, and clears authorization on session changes. Immediate
session revision guards protect role lookup, mutations, reloads, errors and form
resets after logout/token changes, including re-login with the same token.
Expert/user edit controls focus their corresponding form. Requests use no-store.

Validation: `npm run build` and `git diff --check` passed. A temporary local,
synthetic mocked API fixture was verified in headless Chromium at 1440×1000 and
390×844; screenshots inspected at `/tmp/identity-admin-desktop.png` and
`/tmp/identity-admin-mobile.png`. No page overflow on mobile; attendance remains
scrollable. Browser checks verified attendee-only columns, expert-only hosting,
expert form focus, no attendee greeting for an admin-only identity, stale mutation
completion after logout (no list reload/private data), and stale `me` completion
across same-token re-login. Fixture source was removed and is not shipped.
Live VK login/authenticated API checks remain unverified without an operator token.
No deployment, commit or push performed in this step.

Context7 consulted official React `/reactjs/react.dev` guidance on effect cleanup
and ignoring stale asynchronous responses; mutation handling additionally checks
an immediately invalidated session revision before every post-await update.
