# votecd8

Colorado CD-8 ballot drop-box locator: an interactive Leaflet map of CD-8's
boundary, county boundaries (Adams, Weld, Larimer), ballot drop-box
locations, a rolling-media route tracker, and an address-based drop-box
search with driving directions.

## Files

- `index.html` -- the entire site: markup, CSS, and JS in one file, plus all
  map data (county/CD8 boundaries, drop-box coordinates) inlined as JS
  objects. This is the **one and only** canonical page. Do not create a
  second copy of it for any reason (see "Don't duplicate the map page"
  below).
- `notes.html` -- data-sourcing notes, linked from `index.html`.

There is intentionally no build step, bundler, or external data file. Data
lives inline in `index.html` as `const adamsDropboxData = {...}` etc.
(GeoJSON `FeatureCollection`s) and `const rollingMediaStops = [...]`. To
update a drop-box location or route stop, find it by a unique substring of
its name/address (`grep -o` or a small script -- some lines in this file are
100,000+ characters, so don't try to `Read` the whole file or a huge offset
range at once) and edit its `coordinates` in place.

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

## Scope

This repo is the CD8 ballot drop-box map, full stop. It has at times picked
up an unrelated personal task-tracking dashboard (`dashboard.html` +
`tasks.json`) during a session; that was explicitly out of scope and
removed. Don't reintroduce it or anything else unrelated to the CD8 site
here.
