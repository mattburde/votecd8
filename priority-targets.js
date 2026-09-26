// CD-8 Outreach Priority -- input config for priority.html.
//
// One entry per Adams County drop box that falls inside CD-8 (per
// index.html's adamsDropboxData). Boxes whose city is Aurora, Bennett,
// Strasburg, or Byers are outside CD-8 and are intentionally omitted here --
// priority.html renders those from adamsDropboxData directly with a muted
// "outside CD-8" marker instead of a priority tier.
//
// This file holds INPUTS ONLY, never pre-assigned tiers or scores -- those
// are always derived in priority.html from whatever numbers are here. Every
// numeric field below is `null` and every source is "TBD" because we do not
// yet have verified registered-voter, turnout, or accessibility data. Do not
// fill in a placeholder or estimated number here without a real, citable
// source in the matching `sources` field -- a box missing any of the three
// numeric fields is rendered as "insufficient data" by design (see
// priority.html's computeScores()), never defaulted to zero or guessed.
//
// Key = the drop box's `name` exactly as it appears in adamsDropboxData in
// index.html, so priority.html can match entries by name.

const priorityInputs = {
  "Adams County Government Center": {
    radiusMiles: 1,
    registeredVoters: null,
    turnoutGap: null,
    accessibility: null,
    allocationMethod: "area-weighted",
    sources: {
      registeredVoters: "TBD — Adams County precinct-level voter file",
      turnoutGap: "TBD — Adams County 2022 general election results",
      accessibility: "TBD — manual assessment, see methodology"
    },
    lastUpdated: "2026-09-26"
  },
  "Adams County Justice Center": {
    radiusMiles: 1,
    registeredVoters: null,
    turnoutGap: null,
    accessibility: null,
    allocationMethod: "area-weighted",
    sources: {
      registeredVoters: "TBD — Adams County precinct-level voter file",
      turnoutGap: "TBD — Adams County 2022 general election results",
      accessibility: "TBD — manual assessment, see methodology"
    },
    lastUpdated: "2026-09-26"
  },
  "Brighton City Hall": {
    radiusMiles: 1,
    registeredVoters: null,
    turnoutGap: null,
    accessibility: null,
    allocationMethod: "area-weighted",
    sources: {
      registeredVoters: "TBD — Adams County precinct-level voter file",
      turnoutGap: "TBD — Adams County 2022 general election results",
      accessibility: "TBD — manual assessment, see methodology"
    },
    lastUpdated: "2026-09-26"
  },
  "Riverdale Animal Shelter": {
    radiusMiles: 1,
    registeredVoters: null,
    turnoutGap: null,
    accessibility: null,
    allocationMethod: "area-weighted",
    sources: {
      registeredVoters: "TBD — Adams County precinct-level voter file",
      turnoutGap: "TBD — Adams County 2022 general election results",
      accessibility: "TBD — manual assessment, see methodology"
    },
    lastUpdated: "2026-09-26"
  },
  "Commerce City Civic Center": {
    radiusMiles: 1,
    registeredVoters: null,
    turnoutGap: null,
    accessibility: null,
    allocationMethod: "area-weighted",
    sources: {
      registeredVoters: "TBD — Adams County precinct-level voter file",
      turnoutGap: "TBD — Adams County 2022 general election results",
      accessibility: "TBD — manual assessment, see methodology"
    },
    lastUpdated: "2026-09-26"
  },
  "Commerce City Motor Vehicle": {
    radiusMiles: 1,
    registeredVoters: null,
    turnoutGap: null,
    accessibility: null,
    allocationMethod: "area-weighted",
    sources: {
      registeredVoters: "TBD — Adams County precinct-level voter file",
      turnoutGap: "TBD — Adams County 2022 general election results",
      accessibility: "TBD — manual assessment, see methodology"
    },
    lastUpdated: "2026-09-26"
  },
  "Reunion Recreation Center": {
    radiusMiles: 1,
    registeredVoters: null,
    turnoutGap: null,
    accessibility: null,
    allocationMethod: "area-weighted",
    sources: {
      registeredVoters: "TBD — Adams County precinct-level voter file",
      turnoutGap: "TBD — Adams County 2022 general election results",
      accessibility: "TBD — manual assessment, see methodology"
    },
    lastUpdated: "2026-09-26"
  },
  "Daniel Vallez Family Ed Center": {
    radiusMiles: 1,
    registeredVoters: null,
    turnoutGap: null,
    accessibility: null,
    allocationMethod: "area-weighted",
    sources: {
      registeredVoters: "TBD — Adams County precinct-level voter file",
      turnoutGap: "TBD — Adams County 2022 general election results",
      accessibility: "TBD — manual assessment, see methodology"
    },
    lastUpdated: "2026-09-26"
  },
  "Rotella Park": {
    radiusMiles: 1,
    registeredVoters: null,
    turnoutGap: null,
    accessibility: null,
    allocationMethod: "area-weighted",
    sources: {
      registeredVoters: "TBD — Adams County precinct-level voter file",
      turnoutGap: "TBD — Adams County 2022 general election results",
      accessibility: "TBD — manual assessment, see methodology"
    },
    lastUpdated: "2026-09-26"
  },
  "Federal Heights City Hall": {
    radiusMiles: 1,
    registeredVoters: null,
    turnoutGap: null,
    accessibility: null,
    allocationMethod: "area-weighted",
    sources: {
      registeredVoters: "TBD — Adams County precinct-level voter file",
      turnoutGap: "TBD — Adams County 2022 general election results",
      accessibility: "TBD — manual assessment, see methodology"
    },
    lastUpdated: "2026-09-26"
  },
  "Northglenn City Hall": {
    radiusMiles: 1,
    registeredVoters: null,
    turnoutGap: null,
    accessibility: null,
    allocationMethod: "area-weighted",
    sources: {
      registeredVoters: "TBD — Adams County precinct-level voter file",
      turnoutGap: "TBD — Adams County 2022 general election results",
      accessibility: "TBD — manual assessment, see methodology"
    },
    lastUpdated: "2026-09-26"
  },
  "Anythink Library - Wright Farms": {
    radiusMiles: 1,
    registeredVoters: null,
    turnoutGap: null,
    accessibility: null,
    allocationMethod: "area-weighted",
    sources: {
      registeredVoters: "TBD — Adams County precinct-level voter file",
      turnoutGap: "TBD — Adams County 2022 general election results",
      accessibility: "TBD — manual assessment, see methodology"
    },
    lastUpdated: "2026-09-26"
  },
  "Carpenter Skate Park (Margaret Carpenter Rec Center)": {
    radiusMiles: 1,
    registeredVoters: null,
    turnoutGap: null,
    accessibility: null,
    allocationMethod: "area-weighted",
    sources: {
      registeredVoters: "TBD — Adams County precinct-level voter file",
      turnoutGap: "TBD — Adams County 2022 general election results",
      accessibility: "TBD — manual assessment, see methodology"
    },
    lastUpdated: "2026-09-26"
  },
  "Hilltop Village Shopping Center": {
    radiusMiles: 1,
    registeredVoters: null,
    turnoutGap: null,
    accessibility: null,
    allocationMethod: "area-weighted",
    sources: {
      registeredVoters: "TBD — Adams County precinct-level voter file",
      turnoutGap: "TBD — Adams County 2022 general election results",
      accessibility: "TBD — manual assessment, see methodology"
    },
    lastUpdated: "2026-09-26"
  },
  "Thornton Civic Center": {
    radiusMiles: 1,
    registeredVoters: null,
    turnoutGap: null,
    accessibility: null,
    allocationMethod: "area-weighted",
    sources: {
      registeredVoters: "TBD — Adams County precinct-level voter file",
      turnoutGap: "TBD — Adams County 2022 general election results",
      accessibility: "TBD — manual assessment, see methodology"
    },
    lastUpdated: "2026-09-26"
  },
  "Trail Winds Recreation Center": {
    radiusMiles: 1,
    registeredVoters: null,
    turnoutGap: null,
    accessibility: null,
    allocationMethod: "area-weighted",
    sources: {
      registeredVoters: "TBD — Adams County precinct-level voter file",
      turnoutGap: "TBD — Adams County 2022 general election results",
      accessibility: "TBD — manual assessment, see methodology"
    },
    lastUpdated: "2026-09-26"
  },
  "Thornton Community Center": {
    radiusMiles: 1,
    registeredVoters: null,
    turnoutGap: null,
    accessibility: null,
    allocationMethod: "area-weighted",
    sources: {
      registeredVoters: "TBD — Adams County precinct-level voter file",
      turnoutGap: "TBD — Adams County 2022 general election results",
      accessibility: "TBD — manual assessment, see methodology"
    },
    lastUpdated: "2026-09-26"
  },
  "Larkridge Shopping Center": {
    radiusMiles: 1,
    registeredVoters: null,
    turnoutGap: null,
    accessibility: null,
    allocationMethod: "area-weighted",
    sources: {
      registeredVoters: "TBD — Adams County precinct-level voter file",
      turnoutGap: "TBD — Adams County 2022 general election results",
      accessibility: "TBD — manual assessment, see methodology"
    },
    lastUpdated: "2026-09-26"
  },
  "Adams County Human Services Center": {
    radiusMiles: 1,
    registeredVoters: null,
    turnoutGap: null,
    accessibility: null,
    allocationMethod: "area-weighted",
    sources: {
      registeredVoters: "TBD — Adams County precinct-level voter file",
      turnoutGap: "TBD — Adams County 2022 general election results",
      accessibility: "TBD — manual assessment, see methodology"
    },
    lastUpdated: "2026-09-26"
  },
  "Front Range Community College": {
    radiusMiles: 1,
    registeredVoters: null,
    turnoutGap: null,
    accessibility: null,
    allocationMethod: "area-weighted",
    sources: {
      registeredVoters: "TBD — Adams County precinct-level voter file",
      turnoutGap: "TBD — Adams County 2022 general election results",
      accessibility: "TBD — manual assessment, see methodology"
    },
    lastUpdated: "2026-09-26"
  },
  "Westminster City Clerk": {
    radiusMiles: 1,
    registeredVoters: null,
    turnoutGap: null,
    accessibility: null,
    allocationMethod: "area-weighted",
    sources: {
      registeredVoters: "TBD — Adams County precinct-level voter file",
      turnoutGap: "TBD — Adams County 2022 general election results",
      accessibility: "TBD — manual assessment, see methodology"
    },
    lastUpdated: "2026-09-26"
  },
  "Westminster Motor Vehicle": {
    radiusMiles: 1,
    registeredVoters: null,
    turnoutGap: null,
    accessibility: null,
    allocationMethod: "area-weighted",
    sources: {
      registeredVoters: "TBD — Adams County precinct-level voter file",
      turnoutGap: "TBD — Adams County 2022 general election results",
      accessibility: "TBD — manual assessment, see methodology"
    },
    lastUpdated: "2026-09-26"
  },
  "Adams County Western Services Center": {
    radiusMiles: 1,
    registeredVoters: null,
    turnoutGap: null,
    accessibility: null,
    allocationMethod: "area-weighted",
    sources: {
      registeredVoters: "TBD — Adams County precinct-level voter file",
      turnoutGap: "TBD — Adams County 2022 general election results",
      accessibility: "TBD — manual assessment, see methodology"
    },
    lastUpdated: "2026-09-26"
  }
};
