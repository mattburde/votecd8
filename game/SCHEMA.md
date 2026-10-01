# Ballot Journey — data schema

All records are defined by `game/data-adapter.js`'s interface and implemented
by `DemoLocalAdapter` there for the current single-device demo. A real
backend adapter must produce/consume the exact same shapes.

## Participant

```
{
  id: string,                        // anonymous, client-generated; not a voter ID
  createdAt: ISO8601 string,
  displayName: string | null,        // self-chosen, optional, shown only on leaderboards they join
  neighborhoodId: string | null,
  selectedDropBox: {                 // a snapshot of the official box they picked, or null
    name, city, county, lat, lon, source, sourceDate, verifiedAt
  } | null,
  status: "coming" | "ready" | "dropped" | "counted",
  trackingStartedAt: ISO8601 string | null,         // tapped "Track My Ballot"
  ballotArrivedSelfReportedAt: ISO8601 string | null, // self-reported, never inferred from a mailing date
  selfReportedDroppedAt: ISO8601 string | null,
  confirmedAt: ISO8601 string | null,  // set ONLY when an admin approves a submission -- never self-set
  badges: string[]                     // e.g. ["early_bird", "first_100"]
}
```

Game vs. official data: everything on this record is **game data** — either
self-reported by the participant or set by human review. `selectedDropBox`
is a copy of an **official** record (see Drop box below); it carries its own
provenance fields so the distinction survives even after it's embedded here.

## Submission (screenshot confirmation)

```
{
  id: string,
  participantId: string,
  submittedAt: ISO8601 string,
  imageHash: string | null,     // 16-char hex aHash, see game/app.js. The
                                 // image itself is never stored -- see
                                 // "Screenshot privacy" in methodology.html.
  selfAttestation: { sawCountedStatus: true, submittedAt } | null,
  status: "pending" | "duplicate_flagged" | "approved" | "rejected",
  likelyDuplicateOf: string | null,  // another submission's id, if flagged
  reviewedAt: ISO8601 string | null,
  reviewerNote: string | null
}
```

No field here ever holds the original screenshot, a name, an email address,
or any other BallotTrax account detail.

## Neighborhood

```
{
  id: string,            // slug derived from name
  name: string,           // participant-chosen, free text
  county: string | null,  // optional, pre-filled from a participant's selected drop box's county
  createdAt: ISO8601 string
}
```

Deliberately **not** a government geography (precinct/census tract/etc.) in
this first prototype — see "Neighborhood assignment" in DELIVERABLES.md for
why, and what a future version could add.

## Drop box (official data, read-only, not owned by this schema)

Sourced live from `../index.html`'s `adamsDropboxData` (see `game/dropboxes.js`
— same technique as `priority.html`, no duplication, `index.html` untouched):

```
{ name, city, county, lat, lon, source, sourceDate, verifiedAt }
```

`source`/`sourceDate`/`verifiedAt` identify this as official election
information, distinct from anything game-generated, per the project's data
-provenance requirement.

## Derived / computed (not stored, computed on read)

- **Leaderboard row**: `{ neighborhoodId, name, county, participantCount, confirmedCount, participationRate }`
  — computed by `DataAdapter.getLeaderboard()`.
- **Admin stats**: participant/submission counts by status, daily confirmation
  counts, leaderboard — computed by `DataAdapter.getAdminStats()`.
- **Badges**: computed by `game/app.js`'s `computeParticipantBadges()` /
  `computeNeighborhoodMilestones()` from the timestamps above — never stored
  as a separate source of truth, so they can't drift from the data that
  earned them.
