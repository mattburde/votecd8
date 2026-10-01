# Ballot Journey — deliverables

Prototype of a Colorado ballot-return turnout game: track → prepare → vote →
return → counted → neighborhood moves → share. Built as `game/` inside the
existing `mattburde/votecd8` repo, reusing its verified Adams County drop-box
data without touching `index.html`. See `game/methodology.html` for the
user-facing version of this, and `game/SCHEMA.md` for the data shapes.

## 1. What's running, and what isn't

**Built and working today**, entirely static, no server:

- `game/index.html` — the voter-facing app (COMING → READY → DROPPED →
  COUNTED), mobile-first, bottom-nav, under a ~10-second-to-understand
  opening screen with the two parallel actions (Track My Ballot / Find My
  Drop Box).
- `game/admin.html` — admin dashboard (gated by a demo-only code, see
  "Security" below).
- `game/methodology.html` — public methodology/privacy page.
- `game/data-adapter.js` — the full, documented data interface plus a
  working localStorage-backed demo implementation.
- `game/dropboxes.js` — reuses `index.html`'s official, verified Adams
  County drop-box data (CD-8-scoped: Aurora/Bennett/Strasburg/Byers boxes
  excluded, same as `priority.html`).
- `game/app.js` — state machine helpers, client-side perceptual image
  hashing for duplicate detection, badge/milestone logic, leaderboard
  sorting. The non-DOM parts are unit-tested (`tests/game-logic.test.js`,
  run with `node tests/game-logic.test.js`).

**Not built, and why**: a real shared backend. This repo is 100% static
(GitHub Pages serving files from `main` — see the repo's `CLAUDE.md`), and
this prototype was built without credentials to provision a database or
server. A genuine "25 Colorado voters on their own phones compete on one
shared leaderboard" pilot needs one. See §3.

## 2. Setup / deployment instructions

Nothing to build or install for the demo as it stands — it's static files.

1. The whole repo is already deployed via GitHub Pages from `main`. Once
   merged, this prototype is live at
   `https://mattburde.github.io/votecd8/game/`.
2. To run it locally: `python3 -m http.server` from the repo root, then
   visit `http://localhost:8000/game/`. (It needs to be served over HTTP,
   not opened as a `file://` path, because `dropboxes.js` fetches
   `../index.html`.)
3. Admin dashboard: `game/admin.html`, demo code `cd8demo` (see §6 — this is
   explicitly not real security).
4. Run the tests: `node tests/game-logic.test.js` from the repo root.

To go from demo mode to a real pilot, implement `game/data-adapter.js`'s
documented interface against a real backend and swap the export at the
bottom of that file — no other file should need to change. **Recommendation
for the smallest real backend**: Firebase (Firestore for records, Storage
for the brief screenshot-review window in §5, free tier is generous enough
for 25-100 users). Supabase/Postgres is an equally reasonable alternative.
Either requires creating an account/project under the org's control — not
something this session could do without credentials.

## 3. Neighborhood assignment

Spec asked for the simplest defensible system for prototype #1, out of:
census geography, precinct, municipality, predefined zones, or
participant-selected teams.

**Implemented: participant-selected team/neighborhood name.** Reasons:

- Zero geodata dependency beyond what already exists (county, from the
  chosen drop box, is attached as an optional label).
- Carries no inferred demographic, political, or ethnic signal whatsoever
  — it's a string someone typed, same as a team name in any casual game.
- Matches "recommend and implement the simplest defensible system" directly.
- Self-selection is also a feature for the social/viral loop (§11 of the
  spec): people naturally form teams around what they already call their
  community (a street, an apartment complex, a church group), which a
  government boundary wouldn't capture.

**Known tradeoff**: duplicate/near-duplicate names ("Thornton Crew" vs.
"thornton crew!!") currently create separate neighborhoods, since the demo
adapter slugifies names but doesn't fuzzy-match them. A real pilot would
want either admin-curated canonical neighborhoods or a merge tool before
scaling past a handful of organically-named teams.

**Future rollup**: the schema is intentionally decoupled, so a later version
could add an optional precinct/municipality field (derived from the chosen
drop box's county, which we already track) without changing how
self-selected teams work — both could coexist as separate leaderboard views.

## 4. Duplicate-detection approach

Client-side perceptual hashing ("average hash" / aHash): the submitted image
is shrunk to an 8×8 grayscale grid and each pixel is compared to the grid's
average brightness, producing a 64-bit (16 hex char) fingerprint. Two
screenshots of the same confirmation — even re-cropped or re-compressed —
typically differ in only a handful of bits; two unrelated images differ in
roughly half. See `game/app.js`'s `averageHashFromGrayscalePixels` /
`hammingDistanceHex` / `isLikelyDuplicateHash`, unit-tested in
`tests/game-logic.test.js`.

This is explicitly **lightweight abuse resistance, not identity
verification** — matching the spec's own framing. It will not catch a
deliberately altered duplicate, and a flagged pair is never auto-rejected:
it's routed to the human review queue (`duplicate_flagged` status) alongside
every other pending submission.

`DUPLICATE_HASH_THRESHOLD` (currently 10 of 64 bits) is a starting
assumption, not a validated number — see §9, this is one of the first things
worth tuning against real submissions.

## 5. Screenshot-verification approach (and its current limitation)

The spec asks the system to determine whether a screenshot "reasonably
demonstrates the required ballot status," while also requiring aggressive
data minimization (never retain the image longer than necessary).

**What's implemented**: the image is read entirely in the participant's own
browser, converted to the duplicate-detection hash above, and then
discarded — it is never uploaded, never sent anywhere, and never written to
localStorage, even in demo mode. The participant separately attests ("this
shows my ballot was counted") via a checkbox.

**The honest limitation this creates**: because the image is never
retained anywhere, `game/admin.html`'s review queue cannot show a human
reviewer the actual screenshot — only the attestation and the duplicate
signal. That is a direct, deliberate consequence of the privacy requirement
("avoid retaining the screenshot after verification unless technically
necessary") colliding with the requirement for human visual review — in
demo mode, with no backend, there's no secure place to hold the image even
briefly.

**What a real pilot needs**: a backend that can hold a screenshot in
access-controlled storage for the short window between submission and
admin review, then delete it (auto-expire, e.g. 72 hours, whether reviewed
or not). That is explicitly allowed by the "unless technically necessary"
clause in the spec and is the recommended next step — not built here
because it requires the backend from §2/§3.

An OCR/keyword-match pass ("does this image contain the text 'counted' or
'accepted'?") could assist a human reviewer later; it should never replace
one, and isn't built in this prototype.

## 6. Privacy and data-retention design

- Screenshot: never retained (see §5). Only a one-way fingerprint, an
  attestation flag, and a timestamp survive.
- Participant identity: a random client-generated ID plus an optional,
  self-chosen display name. No name/email/address/voter-ID is ever
  requested by the game itself.
- Nothing submitted by a participant is ever shown publicly or to other
  participants — only aggregate neighborhood counts are public.
- `game/methodology.html` is the user-facing disclosure of all of the
  above, linked from both the game and the admin dashboard.

## 7. Security — what's real and what's a demo placeholder

**Not real security, flagged loudly in the UI itself**:
`game/admin.html`'s "gate" is a hardcoded string compared client-side
(`cd8demo`) — anyone who reads the page source has it. This exists purely so
the admin dashboard isn't one click away with zero friction during the
prototype-testing phase. **Before any real data (even demo-pilot data from
real people) touches this dashboard, it needs real backend-enforced
authentication** — this is listed explicitly so it doesn't get missed.

## 8. Legal / licensing / privacy items requiring human review

*(Per the spec's explicit instruction: flagged for human review, not
assumed.)*

1. **BallotTrax**: this prototype links to the official BallotTrax site
   (`https://ballottrax.coloradosos.gov/voter/`) exactly as `index.html`
   already does — no scraping, no automation, no assumed API. Confirm there's
   no issue with directing third-party game traffic to it, and whether any
   BallotTrax/SOS trademark or branding guidance applies to referencing it
   by name.
2. **"BallotTrax" name/trademark usage** in game copy and the methodology
   page — confirm acceptable fair-reference use.
3. **Incentives/prizes**: none are implemented (no points redeemable for
   anything of value, per the spec's own instruction). If any reward beyond
   bragging rights/badges is ever considered, Colorado election-law review
   is required before building it — explicitly not assumed here.
4. **"Neighborhood competition" and election law**: confirm a civic
   turnout game encouraging prompt ballot return, organized by
   self-selected teams, doesn't trigger any Colorado election-administration
   or campaign-finance-adjacent rule (e.g. rules around organized
   ballot-collection activity, "ballot chasing," ballot handling by
   third parties) — this prototype never touches, collects, or transports
   anyone's physical ballot, only location/status information, but that
   distinction should be confirmed by someone with election-law expertise,
   not assumed by this build.
5. **Privacy law**: no PII is intentionally collected, but confirm this
   design (anonymous ID + optional self-chosen name + ephemeral image
   hashing) satisfies any applicable privacy-law obligations once real
   backend storage is added, including a published retention policy
   matching what's actually implemented.
6. **Accessibility**: basic semantic HTML and large tap targets are in
   place; a full WCAG pass has not been done and should happen before a
   real pilot (§15 of the spec calls for accessibility as a priority).
7. **Bilingual-ready architecture**: all user-facing copy currently lives as
   plain strings inline in the HTML/JS rather than hardcoded into markup
   structure, which keeps translation mechanically straightforward, but no
   actual Spanish-language copy or i18n framework has been added yet.

## 9. Observations to prioritize from the first 25–100 users

In rough priority order, matching the spec's success criterion ("does this
cause people to return ballots sooner / more completely"):

1. **Drop-off between COMING and READY**: of people who open the app, what
   fraction tap *either* Track My Ballot or Find My Drop Box within the
   first visit? (Tests whether the opening screen actually works in ~10
   seconds, per §15.)
2. **Time from "ballot arrived" (self-reported) to "dropped" (self-reported)**
   — the core behavioral bet of the whole product. Compare, if possible,
   against any available baseline (even anecdotal) for how long people
   normally sit on a ballot.
3. **Conversion from "dropped" to an actual screenshot submission** — if
   this is low, the screenshot-confirmation step itself may be the
   friction point worth redesigning before anything else.
4. **False-positive and false-negative rate of the duplicate-hash flag**,
   once an admin has reviewed enough flagged pairs to judge — directly
   informs whether `DUPLICATE_HASH_THRESHOLD` (§4) needs adjusting.
5. **Neighborhood participation skew**: do a handful of neighborhoods
   dominate while most have 1-2 people? If so, the "Highest Participation"
   leaderboard's minimum-size cutoff (`MIN_PARTICIPANTS_FOR_RATE_LEADERBOARD`
   in `game/app.js`) may need tuning, and it signals whether the
   team-formation UX needs a way to join an *existing* team more
   prominently than creating a new one.
6. **Share-action usage**: which of the four share surfaces (generic game
   share, achievement share, neighborhood progress, challenge another
   neighborhood — note: only generic + achievement sharing are built in
   this pass, see §10) actually drives new participants, measurable once
   a real backend can attribute joins to a share.
7. **Early Bird / First 100 badge-earn rate**: if badges are earned by
   nearly everyone or almost no one, the thresholds
   (`EARLY_BIRD_WINDOW_DAYS`, the hardcoded 100 in `computeParticipantBadges`)
   aren't calibrated to this population and should move.

## 10. Known gaps vs. the full spec (for the next pass)

- Neighborhood-progress share and "challenge another neighborhood" share
  (spec §11) are not yet separate UI actions — only generic game-share and
  "my ballot counted" are implemented in `game/index.html`.
  `shareText()`/`shareGeneric()`/`shareAchievement()` in `game/index.html`
  are written so adding the other two is additive, not a rewrite.
- No real backend (§2/§3) — the single biggest gap before a multi-person
  pilot.
- No automated OCR assist for reviewers (§5) — by design, not accidental.
- Spanish-language copy not yet written (§8.7).
