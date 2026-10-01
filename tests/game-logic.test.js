"use strict";
/*
 * Plain-Node tests for game/app.js's pure logic (no test framework --
 * consistent with the rest of this repo, which has no build step/CI).
 * Run with: node tests/game-logic.test.js
 */

const assert = require("assert");
const {
  averageHashFromGrayscalePixels,
  hammingDistanceHex,
  isLikelyDuplicateHash,
  computeParticipantBadges,
  computeNeighborhoodMilestones,
  sortByMostConfirmed,
  sortByHighestParticipation,
  MIN_PARTICIPANTS_FOR_RATE_LEADERBOARD
} = require("../game/app.js");

let passed = 0;
function check(name, fn) {
  try {
    fn();
    passed++;
    console.log("ok  -", name);
  } catch (e) {
    console.error("FAIL -", name);
    console.error("     " + e.message);
    process.exitCode = 1;
  }
}

// ---------- averageHashFromGrayscalePixels / hammingDistanceHex ----------

check("averageHashFromGrayscalePixels produces a 16-char hex hash for 64 pixels", () => {
  const pixels = new Array(64).fill(128);
  const hash = averageHashFromGrayscalePixels(pixels);
  assert.strictEqual(hash.length, 16);
  assert.ok(/^[0-9a-f]+$/.test(hash));
});

check("averageHashFromGrayscalePixels throws on wrong pixel count", () => {
  assert.throws(() => averageHashFromGrayscalePixels([1, 2, 3]));
});

check("identical pixel grids produce identical hashes", () => {
  const pixels = Array.from({ length: 64 }, (_, i) => (i * 7) % 256);
  assert.strictEqual(averageHashFromGrayscalePixels(pixels), averageHashFromGrayscalePixels(pixels.slice()));
});

check("hammingDistanceHex(x, x) === 0", () => {
  const pixels = Array.from({ length: 64 }, (_, i) => (i * 13) % 256);
  const hash = averageHashFromGrayscalePixels(pixels);
  assert.strictEqual(hammingDistanceHex(hash, hash), 0);
});

check("a small pixel perturbation stays within the duplicate threshold", () => {
  const base = Array.from({ length: 64 }, (_, i) => (i * 4) % 256);
  const hashA = averageHashFromGrayscalePixels(base);
  const perturbed = base.slice();
  perturbed[0] = Math.min(255, perturbed[0] + 10);
  perturbed[1] = Math.max(0, perturbed[1] - 10);
  const hashB = averageHashFromGrayscalePixels(perturbed);
  assert.ok(isLikelyDuplicateHash(hashA, hashB), "small perturbation should still be flagged as a likely duplicate");
});

check("flipping half the bits of a hash is NOT flagged as a duplicate", () => {
  const hashA = "0000000000000000";
  // flip every other hex nibble to its complement -> far more than the
  // DUPLICATE_HASH_THRESHOLD bits different
  const hashB = "f0f0f0f0f0f0f0f0";
  assert.ok(!isLikelyDuplicateHash(hashA, hashB));
});

check("hammingDistanceHex throws on mismatched hash lengths", () => {
  assert.throws(() => hammingDistanceHex("ab", "abc"));
});

// ---------- computeParticipantBadges ----------

check("no badges before a participant is confirmed", () => {
  const p = { status: "dropped", confirmedAt: null, ballotArrivedSelfReportedAt: "2026-10-01T00:00:00Z" };
  assert.deepStrictEqual(computeParticipantBadges(p, 1), []);
});

check("early_bird awarded when confirmed within the window of ballot arrival", () => {
  const p = {
    status: "counted",
    ballotArrivedSelfReportedAt: "2026-10-01T00:00:00Z",
    confirmedAt: "2026-10-02T00:00:00Z" // 1 day later
  };
  const badges = computeParticipantBadges(p, null);
  assert.ok(badges.includes("early_bird"));
});

check("early_bird NOT awarded when confirmed well after the window", () => {
  const p = {
    status: "counted",
    ballotArrivedSelfReportedAt: "2026-10-01T00:00:00Z",
    confirmedAt: "2026-10-20T00:00:00Z" // 19 days later
  };
  const badges = computeParticipantBadges(p, null);
  assert.ok(!badges.includes("early_bird"));
});

check("early_bird NOT awarded when ballot-arrival time was never recorded", () => {
  const p = { status: "counted", ballotArrivedSelfReportedAt: null, confirmedAt: "2026-10-02T00:00:00Z" };
  const badges = computeParticipantBadges(p, null);
  assert.ok(!badges.includes("early_bird"));
});

check("first_100 awarded only when rank is within the top 100", () => {
  const p = { status: "counted", confirmedAt: "2026-10-02T00:00:00Z", ballotArrivedSelfReportedAt: null };
  assert.ok(computeParticipantBadges(p, 100).includes("first_100"));
  assert.ok(!computeParticipantBadges(p, 101).includes("first_100"));
});

// ---------- computeNeighborhoodMilestones ----------

check("25/50/75% milestones fire only when newly crossed", () => {
  const before = { participantCount: 10, confirmedCount: 2 }; // 20%
  const after = { participantCount: 10, confirmedCount: 6 };  // 60%
  const milestones = computeNeighborhoodMilestones(before, after);
  assert.deepStrictEqual(milestones.sort(), ["milestone_25", "milestone_50"]);
});

check("milestones already crossed before this confirmation are not re-announced", () => {
  const before = { participantCount: 10, confirmedCount: 6 }; // already past 25/50
  const after = { participantCount: 10, confirmedCount: 7 };  // still under 75
  assert.deepStrictEqual(computeNeighborhoodMilestones(before, after), []);
});

check("neighborhood_complete requires the minimum participant count", () => {
  const before = { participantCount: 2, confirmedCount: 1 };
  const after = { participantCount: 2, confirmedCount: 2 }; // 100% but too small
  assert.ok(!computeNeighborhoodMilestones(before, after).includes("neighborhood_complete"));
});

check("neighborhood_complete fires at 100% once above the minimum size", () => {
  const before = { participantCount: 5, confirmedCount: 4 };
  const after = { participantCount: 5, confirmedCount: 5 };
  assert.ok(computeNeighborhoodMilestones(before, after).includes("neighborhood_complete"));
});

check("empty neighborhood (0 participants) never divides by zero / never crashes", () => {
  const before = { participantCount: 0, confirmedCount: 0 };
  const after = { participantCount: 0, confirmedCount: 0 };
  assert.deepStrictEqual(computeNeighborhoodMilestones(before, after), []);
});

// ---------- Leaderboard sorting ----------

check("sortByMostConfirmed sorts descending by raw confirmed count", () => {
  const rows = [
    { name: "A", confirmedCount: 3 },
    { name: "B", confirmedCount: 10 },
    { name: "C", confirmedCount: 7 }
  ];
  const sorted = sortByMostConfirmed(rows).map(r => r.name);
  assert.deepStrictEqual(sorted, ["B", "C", "A"]);
});

check("sortByMostConfirmed does not mutate the input array", () => {
  const rows = [{ name: "A", confirmedCount: 1 }, { name: "B", confirmedCount: 2 }];
  const original = rows.slice();
  sortByMostConfirmed(rows);
  assert.deepStrictEqual(rows, original);
});

check("sortByHighestParticipation excludes neighborhoods below the minimum size", () => {
  const rows = [
    { name: "tiny", participantCount: 1, participationRate: 1.0 },
    { name: "small", participantCount: MIN_PARTICIPANTS_FOR_RATE_LEADERBOARD, participationRate: 0.5 },
    { name: "big", participantCount: 50, participationRate: 0.9 }
  ];
  const sorted = sortByHighestParticipation(rows).map(r => r.name);
  assert.deepStrictEqual(sorted, ["big", "small"]);
});

check("sortByHighestParticipation sorts descending by rate, not raw count", () => {
  const rows = [
    { name: "bigger-but-lower-rate", participantCount: 100, participationRate: 0.2 },
    { name: "smaller-but-higher-rate", participantCount: 10, participationRate: 0.8 }
  ];
  const sorted = sortByHighestParticipation(rows).map(r => r.name);
  assert.deepStrictEqual(sorted, ["smaller-but-higher-rate", "bigger-but-lower-rate"]);
});

console.log("\n" + passed + " test(s) passed" + (process.exitCode ? ", SOME FAILED" : ""));
