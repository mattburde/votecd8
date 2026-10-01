"use strict";
/*
 * data-adapter.js -- the ONLY place that reads/writes participant, submission,
 * neighborhood, or leaderboard data.
 *
 * WHY THIS FILE EXISTS
 * ---------------------
 * This game needs real shared state across many participants and devices:
 * a neighborhood leaderboard everyone sees the same numbers for, a duplicate
 * -submission check that works across participants, and an admin review
 * queue a human can act on from a different device than the one that
 * submitted. None of that is possible with browser localStorage alone --
 * localStorage is private to one browser on one device.
 *
 * This repo (mattburde/votecd8) is a static GitHub Pages site with no
 * server and no database. Building this prototype in this environment, we
 * have no credentials to provision a real shared backend (no Firebase
 * project, no Supabase project, no database of any kind). Rather than fake
 * a shared backend or silently build something that looks multiplayer but
 * isn't, every piece of app code in game/ talks ONLY to the interface
 * defined here -- never to localStorage or any storage directly.
 *
 * DemoLocalAdapter below is a fully working implementation of that
 * interface backed by localStorage, so the complete behavioral loop (COMING
 * -> READY -> DROPPED -> COUNTED -> neighborhood moves) can be built,
 * tested, and demoed end-to-end on one device today. It is NOT a real
 * multi-device backend, and the UI says so (see the "Demo mode" banner in
 * game/index.html and game/admin.html).
 *
 * TO GO LIVE WITH REAL PARTICIPANTS ACROSS DEVICES: implement this same
 * interface against a real backend (Firestore, Supabase/Postgres, or a
 * small REST API) and swap it in at the bottom of this file. No other file
 * in game/ should need to change. See game/DELIVERABLES.md for the
 * concrete recommendation and what it would take.
 *
 * DATA ADAPTER INTERFACE (every method is async, even DemoLocalAdapter's,
 * so swapping in a real network-backed adapter is a drop-in replacement):
 *
 *   getOrCreateParticipant()              -> Participant
 *   updateParticipant(id, patch)          -> Participant
 *   getParticipant(id)                    -> Participant | null
 *
 *   listNeighborhoods()                   -> Neighborhood[]
 *   getOrCreateNeighborhood(name, county) -> Neighborhood
 *
 *   createSubmission(data)                -> { submission, duplicateOf }
 *   listSubmissions(filter)               -> Submission[]   (admin)
 *   reviewSubmission(id, decision, note)  -> Submission      (admin)
 *
 *   getLeaderboard()                      -> LeaderboardRow[]
 *   getAdminStats()                       -> AdminStats
 *
 * See game/SCHEMA.md for the full shape of each record.
 */

const STORAGE_PREFIX = "cd8game_demo_v1_";
const KEYS = {
  participant: STORAGE_PREFIX + "participant",
  participants: STORAGE_PREFIX + "participants", // admin-visible list, demo mode only
  neighborhoods: STORAGE_PREFIX + "neighborhoods",
  submissions: STORAGE_PREFIX + "submissions"
};

function uid(prefix) {
  return (prefix || "id") + "_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
}

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    return fallback;
  }
}

function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    // localStorage can be unavailable (private browsing, quota) -- the app
    // should degrade, not crash. Callers should not assume writes persist.
  }
}

class DemoLocalAdapter {
  constructor() {
    this._demoMode = true; // app code checks this to show the "demo mode" banner
  }

  // ---------- Participant ----------

  async getOrCreateParticipant() {
    let p = readJSON(KEYS.participant, null);
    if (p) return p;
    p = {
      id: uid("p"),
      createdAt: new Date().toISOString(),
      displayName: null,
      neighborhoodId: null,
      selectedDropBox: null, // { name, lat, lon, county }
      status: "coming", // coming | ready | dropped | counted
      trackingStartedAt: null, // when they tapped "Track My Ballot"
      ballotArrivedSelfReportedAt: null,
      selfReportedDroppedAt: null,
      confirmedAt: null, // set only when an admin approves a submission
      badges: []
    };
    writeJSON(KEYS.participant, p);
    this._registerParticipant(p);
    return p;
  }

  async getParticipant(id) {
    const mine = readJSON(KEYS.participant, null);
    if (mine && mine.id === id) return mine;
    const all = readJSON(KEYS.participants, {});
    return all[id] || null;
  }

  async updateParticipant(id, patch) {
    let p = readJSON(KEYS.participant, null);
    if (!p || p.id !== id) throw new Error("updateParticipant: unknown participant in this browser");
    p = Object.assign({}, p, patch);
    writeJSON(KEYS.participant, p);
    this._registerParticipant(p);
    return p;
  }

  // Demo-mode-only bookkeeping: mirror this browser's participant into a
  // shared-looking list so the admin dashboard has something to show when
  // opened in the same browser. A real adapter wouldn't need this -- the
  // backend would already see every participant.
  _registerParticipant(p) {
    const all = readJSON(KEYS.participants, {});
    all[p.id] = p;
    writeJSON(KEYS.participants, all);
  }

  // ---------- Neighborhoods ----------

  async listNeighborhoods() {
    return Object.values(readJSON(KEYS.neighborhoods, {}));
  }

  async getOrCreateNeighborhood(name, county) {
    const trimmed = (name || "").trim();
    if (!trimmed) throw new Error("Neighborhood name required");
    const id = "n_" + trimmed.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const all = readJSON(KEYS.neighborhoods, {});
    if (all[id]) return all[id];
    const neighborhood = { id, name: trimmed, county: county || null, createdAt: new Date().toISOString() };
    all[id] = neighborhood;
    writeJSON(KEYS.neighborhoods, all);
    return neighborhood;
  }

  // ---------- Submissions ----------

  async createSubmission(data) {
    const submissions = readJSON(KEYS.submissions, {});
    const existing = Object.values(submissions);

    // Lightweight duplicate check: same participant re-submitting, or a
    // near-identical image (perceptual hash Hamming distance below
    // threshold) from ANY participant. See app.js hammingDistance() /
    // DUPLICATE_HASH_THRESHOLD for the matching logic -- this adapter just
    // stores the result, it doesn't compute the hash.
    const duplicateOf = existing.find(s =>
      s.participantId === data.participantId && s.status !== "rejected"
    ) || null;

    const submission = {
      id: uid("s"),
      participantId: data.participantId,
      submittedAt: new Date().toISOString(),
      imageHash: data.imageHash || null,
      selfAttestation: data.selfAttestation || null,
      status: duplicateOf ? "duplicate_flagged" : "pending",
      likelyDuplicateOf: duplicateOf ? duplicateOf.id : null,
      reviewedAt: null,
      reviewerNote: null
    };
    submissions[submission.id] = submission;
    writeJSON(KEYS.submissions, submissions);
    return { submission, duplicateOf };
  }

  async listSubmissions(filter) {
    filter = filter || {};
    let list = Object.values(readJSON(KEYS.submissions, {}));
    if (filter.status) list = list.filter(s => s.status === filter.status);
    if (filter.participantId) list = list.filter(s => s.participantId === filter.participantId);
    return list.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
  }

  async reviewSubmission(id, decision, note) {
    const submissions = readJSON(KEYS.submissions, {});
    const s = submissions[id];
    if (!s) throw new Error("Unknown submission: " + id);
    s.status = decision; // "approved" | "rejected"
    s.reviewedAt = new Date().toISOString();
    s.reviewerNote = note || null;

    if (decision === "approved") {
      const all = readJSON(KEYS.participants, {});
      const p = all[s.participantId];
      if (p) {
        // Neighborhood stats *before* this confirmation, for milestone
        // detection (computeNeighborhoodMilestones needs a before/after
        // pair so it only reports thresholds newly crossed -- see app.js).
        const statsBefore = p.neighborhoodId
          ? await this._neighborhoodStats(p.neighborhoodId, all)
          : { participantCount: 0, confirmedCount: 0 };

        p.status = "counted";
        p.confirmedAt = s.reviewedAt;
        all[s.participantId] = p;

        let rank = null;
        if (p.neighborhoodId) {
          const confirmedInOrder = Object.values(all)
            .filter(x => x.neighborhoodId === p.neighborhoodId && x.status === "counted" && x.confirmedAt)
            .sort((a, b) => new Date(a.confirmedAt) - new Date(b.confirmedAt));
          rank = confirmedInOrder.findIndex(x => x.id === p.id) + 1; // 1-based
        }
        p.badges = computeParticipantBadges(p, rank);
        all[s.participantId] = p;
        writeJSON(KEYS.participants, all);
        const mine = readJSON(KEYS.participant, null);
        if (mine && mine.id === p.id) writeJSON(KEYS.participant, p);

        if (p.neighborhoodId) {
          const statsAfter = await this._neighborhoodStats(p.neighborhoodId, all);
          s.neighborhoodMilestonesReached = computeNeighborhoodMilestones(statsBefore, statsAfter);
        }
      }
    }

    submissions[id] = s;
    writeJSON(KEYS.submissions, submissions);
    return s;
  }

  // participants: the already-loaded {id: Participant} map to compute
  // against (avoids re-reading localStorage mid-review when the caller
  // already has a fresher in-memory copy, e.g. with this approval's status
  // change already applied for the "after" snapshot).
  async _neighborhoodStats(neighborhoodId, participantsMap) {
    const all = participantsMap || readJSON(KEYS.participants, {});
    const members = Object.values(all).filter(p => p.neighborhoodId === neighborhoodId);
    return {
      participantCount: members.length,
      confirmedCount: members.filter(p => p.status === "counted").length
    };
  }

  // ---------- Leaderboard / admin aggregates ----------

  async getLeaderboard() {
    const neighborhoods = Object.values(readJSON(KEYS.neighborhoods, {}));
    const participants = Object.values(readJSON(KEYS.participants, {}));
    return neighborhoods.map(n => {
      const members = participants.filter(p => p.neighborhoodId === n.id);
      const confirmed = members.filter(p => p.status === "counted").length;
      return {
        neighborhoodId: n.id,
        name: n.name,
        county: n.county,
        participantCount: members.length,
        confirmedCount: confirmed,
        participationRate: members.length > 0 ? confirmed / members.length : 0
      };
    });
  }

  async getAdminStats() {
    const participants = Object.values(readJSON(KEYS.participants, {}));
    const submissions = Object.values(readJSON(KEYS.submissions, {}));
    const byStatus = { pending: 0, approved: 0, rejected: 0, duplicate_flagged: 0 };
    submissions.forEach(s => { byStatus[s.status] = (byStatus[s.status] || 0) + 1; });

    const dailyConfirmations = {};
    participants.forEach(p => {
      if (p.status === "counted" && p.confirmedAt) {
        const day = p.confirmedAt.slice(0, 10);
        dailyConfirmations[day] = (dailyConfirmations[day] || 0) + 1;
      }
    });

    return {
      participantCount: participants.length,
      selfReportedDroppedCount: participants.filter(p => !!p.selfReportedDroppedAt).length,
      submissionsTotal: submissions.length,
      submissionsByStatus: byStatus,
      confirmedCount: participants.filter(p => p.status === "counted").length,
      dailyConfirmations,
      leaderboard: await this.getLeaderboard()
    };
  }
}

// Swap point: replace this with a real backend-backed adapter (implementing
// the exact same interface) once one exists. Everything else in game/
// imports `DataAdapter` from here and never touches localStorage directly.
const DataAdapter = new DemoLocalAdapter();
