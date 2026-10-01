# votecd8

Colorado CD-8 ballot drop-box locator: an interactive Leaflet map of CD-8's
boundary, county boundaries (Adams, Weld, Larimer), ballot drop-box
locations, and an address-based drop-box search with driving directions.

## Files

- `index.html` -- the entire site: markup, CSS, and JS in one file, plus all
  map data (county/CD8 boundaries, drop-box coordinates) inlined as JS
  objects. This is the **one and only** canonical page. Do not create a
  second copy of it for any reason (see "Don't duplicate the map page"
  below).
- `notes.html` -- data-sourcing notes, linked from `index.html`.
- `priority.html` -- a separate, clearly-disclaimed "CD-8 Outreach Analysis"
  page: independent, non-official population/turnout estimates layered on
  Adams County's drop boxes, ranked into priority tiers. Linked from
  `index.html`'s header ("See outreach analysis →") and links back. Reuses
  `cd8Data`/`countiesData`/`adamsDropboxData` from `index.html` at runtime
  (`fetch('./index.html')` + a brace-matching extractor in its own script) --
  it does **not** duplicate that data inline, and must never be changed to
  do so. `index.html` itself is not to be restructured to accommodate this
  (e.g. no extracting its data into a shared file) -- the one header link is
  the only change `priority.html`'s existence should ever require there.
- `priority-targets.js` -- inputs-only config for `priority.html`, one entry
  per in-CD8 Adams drop box (keyed by exact box name). Every numeric field
  starts `null`/`"TBD"` until backed by a real, cited source -- never fill
  one in with a guessed or estimated number. `priority.html`'s own script
  derives scores/tiers from whatever is here; this file must never hold a
  pre-assigned tier or score itself.
- `game/` -- "Ballot Journey," a separate turnout-game prototype (track your
  ballot, find a drop box, confirm it counted, neighborhood leaderboard). A
  **turnout product, not a persuasion product**: never asks how someone
  voted, never recommends a candidate. It's a self-contained app with its
  own files (`index.html`, `admin.html`, `methodology.html`,
  `data-adapter.js`, `dropboxes.js`, `app.js`); see `game/DELIVERABLES.md`
  for the full writeup and `game/SCHEMA.md` for data shapes. Key constraints
  that must hold for any future change in here:
  - It reuses `index.html`'s official drop-box data the same way
    `priority.html` does (fetch + extract, no duplication), and must never
    modify `index.html`.
  - It has **no real backend** -- this repo is static GitHub Pages with no
    server. `game/data-adapter.js` is a documented, swappable storage
    interface; the shipped implementation is a single-device localStorage
    demo, clearly labeled as such in the UI. Don't let that labeling quietly
    disappear, and don't build new game features that assume real
    cross-device shared state exists until a real backend adapter is wired
    in (see DELIVERABLES.md §2-3).
  - Screenshot images are never retained anywhere, by design (only a
    client-computed perceptual hash + a self-attestation survive) -- see
    DELIVERABLES.md §5-6 before changing anything in the screenshot-submit
    flow, since that tradeoff was deliberate, not an oversight.
  - `game/admin.html`'s access gate is explicitly not real security (a
    hardcoded demo string) -- don't treat it as one, and don't let real
    participant data flow through it without replacing it first.

There is intentionally no build step, bundler, or external data file for the
map itself. Data lives inline in `index.html` as `const adamsDropboxData =
{...}` etc. (GeoJSON `FeatureCollection`s). To update a drop-box location,
find it by a unique substring of its name/address (`grep -o` or a small
script -- some lines in this file are 100,000+ characters, so don't try to
`Read` the whole file or a huge offset range at once) and edit its
`coordinates` in place.

## Deployment -- READ THIS BEFORE DEBUGGING A "LIVE SITE" BUG

**GitHub Pages serves this site from the `main` branch.** It does not serve
from any feature/session branch. A change only reaches
`https://mattburde.github.io/votecd8/` once it's on `main`.

If asked to fix something described as broken "on the site" or "live":
1. Do the work on a feature branch as usual, but **merge it to `main` and
   push `main`** before telling the user to retest. A fix sitting only on a
   feature branch is invisible to them no matter how correct it is.
2. Before spending time on a *new* theory for why a bug persists, check
   whether the fix actually reached `main` and deployed:
   - `git log --oneline -1 origin/main` vs. the branch you fixed it on.
   - `mcp__github__actions_list` with `method: "list_workflow_runs"` --
     look for a `"pages build and deployment"` run against the commit you
     expect to be live, with `"conclusion": "success"`.
   This takes seconds and rules out an entire class of "the bug is still
   there" reports that are actually just an unmerged branch or a pending
   deploy, not a code problem.
3. Even after confirming deployment, **Safari (especially iOS) aggressively
   caches pages** and a close/reopen doesn't reliably force a re-fetch. If a
   confirmed-deployed fix "isn't showing up," have the user check in a
   Private Browsing tab first -- if it shows correctly there, it's a client
   cache issue, not a code issue. (Settings -> Safari -> Advanced -> Website
   Data -> remove the `github.io` entry is the targeted fix; full "Clear
   History and Website Data" also works but wipes the localStorage layer
   preferences described below.)

## Don't duplicate the map page

This repo previously had `CD8_interactive_map.html` (a near-identical,
unlinked copy of `index.html`) and `CD8_map_script.js` (tracked but never
loaded by anything). Both were deleted because every fix had to be applied
twice and they silently drifted out of sync -- exactly the kind of bug this
project doesn't need more of. Keep it to one file. If you're ever tempted to
save a second copy of the map "just in case," don't -- use git history
instead.

## Debugging the Leaflet map -- lessons from a real incident

This project hit a real bug where map layers (county boundaries, drop-box
markers) would sometimes not render when their checkbox was checked, only
appearing after manually toggling the checkbox off and back on. Two rounds
of fixing this went badly before landing on the real cause; the process
matters as much as the specific fix:

- **The real, confirmed cause**: Leaflet's `map.addLayer(layer)` is a silent
  no-op if it already considers the layer "on" the map. Any code path that
  could result in a layer being added before its controlling checkbox's
  logic runs (e.g. a layer built with `.addTo(map)` at construction, or one
  added a moment earlier some other way) causes a *later* "turn it on" call
  to do nothing -- the layer keeps whatever stale projection it had, and
  never gets `map.invalidateSize()`'s benefit, because no real add ever
  happens. The fix, in `setLayerVisible()`: always `removeLayer()` first
  (harmless no-op if not present) before `invalidateSize()` + `addLayer()`,
  so turning a layer on is *always* a genuine fresh add. This applies
  uniformly to every layer that flows through `setLayerVisible()` /
  `toggleRouteLayer()`.
- **What went wrong before landing on that fix**: two earlier "fixes"
  (extra `setTimeout`/`ResizeObserver` invalidation, then a
  `pageshow`/`visibilitychange` handler that tore down and rebuilt every
  layer) were both reasoning about hypothetical mobile-Safari-internal
  behavior (container sizing timing, backgrounded-tab repaint glitches)
  that couldn't actually be observed or tested from this environment --
  there's no access to a real iOS Safari to confirm any of it. The second
  one shipped anyway and made toggling *worse* in real use (broad event
  listeners firing more often, and more disruptively, than intended), and
  had to be reverted.
- **The lesson**: prefer a fix you can prove by reproducing the *exact*
  failure condition in a test over a fix that only sounds plausible. For
  this bug, that meant simulating "a layer Leaflet already thinks is on the
  map" directly (`page.evaluate(() => map.addLayer(layer))` before its
  checkbox reflects that) and confirming the checkbox still forces a real
  re-add -- not guessing about backgrounding/bfcache behavior no one could
  verify. When a bug report keeps recurring against different layers after
  a "fix," that's a signal the fix addressed one instance of a class of bug
  rather than the class itself -- look for the general mechanism (as with
  the no-op loophole above) rather than patching each reported instance.
- Test changes to `index.html` with a local Leaflet install (the CDN is
  usually unreachable from a sandboxed/offline dev environment) --
  `npm install leaflet@1.9.4`, copy `leaflet.js`/`leaflet.css`/`images/`
  next to a local copy of `index.html`, swap the `<link>`/`<script>` src
  attributes, serve with `python3 -m http.server`, and drive it with
  Playwright (Chromium is preinstalled in this environment at
  `/opt/pw-browsers/chromium`).

## QA/QC checklist -- run this before calling a change done

Don't declare a change finished just because the Edit tool call succeeded.
Before telling the user something is live:

1. **Confirm the edit actually landed as intended.** After editing, `grep`
   for the exact new content (and, for a removal, confirm the old content
   is gone) -- don't just trust the diff summary. For `index.html` JS
   changes, run
   `node -e "new Function(require('fs').readFileSync('index.html','utf8').match(/<script>([\s\S]*?)<\/script>\s*<\/body>/)[1])"`
   to catch syntax errors before they ever reach a browser.
2. **For anything behavioral/interactive** (map layers, toggles, event
   handlers, persistence) -- test it locally per the "Debugging the Leaflet
   map" section below (vendored Leaflet + a local server + Playwright)
   *before* pushing. Don't ship a behavioral change on reasoning alone if
   it can be exercised locally instead.
3. **Push the feature branch, then merge to `main` and push `main`.** A fix
   that isn't on `main` isn't live -- see "Deployment" above.
4. **Verify the Pages deployment succeeded** for the exact commit SHA you
   expect to be live, via `mcp__github__actions_list` /
   `list_workflow_runs` (`"conclusion": "success"` against that SHA). Do
   this yourself, every time -- it takes seconds and is the single check
   most likely to explain a "why isn't this working" report before it
   even happens.
5. **Match how much you ask the user to re-verify to the actual risk.**
   Once steps 1-4 all check out for a plain content/data change (a new
   link, a corrected coordinate, edited text) with no behavioral risk,
   that's sufficient -- don't also ask the user to check Private Browsing
   or otherwise re-verify; a successful, confirmed deploy of a static
   content change is the answer, not a starting point for more doubt.
   Reserve "please confirm on your device" for changes whose correctness
   depends on real browser/device behavior this environment can't fully
   simulate (e.g. mobile Safari quirks) -- and say specifically *why*
   you're asking, not as a reflexive hedge on every change.

## Scope

This repo is the CD8 ballot drop-box map, full stop. It has at times picked
up an unrelated personal task-tracking dashboard (`dashboard.html` +
`tasks.json`) during a session; that was explicitly out of scope and
removed. Don't reintroduce it or anything else unrelated to the CD8 site
here.
