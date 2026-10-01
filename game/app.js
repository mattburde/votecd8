"use strict";
/*
 * app.js -- core game logic. Pure, testable functions are kept separate
 * from DOM/canvas-dependent wrappers so the scoring/dedup/milestone logic
 * can be unit-tested in plain Node (see tests/game-logic.test.js) without a
 * browser. UI wiring lives in game/index.html and game/admin.html, which
 * call these functions.
 */

// ============================================================
// Perceptual image hashing (duplicate-screenshot detection)
// ============================================================
//
// This computes a simple "average hash" (aHash): shrink the image to a
// small grayscale grid, compare each pixel to the average brightness, and
// pack the above/below-average bits into a hex string. Two screenshots of
// the *same* BallotTrax confirmation (even re-cropped, re-compressed, or
// re-screenshotted) produce hashes that differ in only a few bits; two
// unrelated images differ in roughly half the bits. It is NOT cryptographic
// and is NOT meant to catch a deliberately-edited duplicate -- it's the
// "lightweight, reasonable abuse resistance" the spec asks for, not
// identity verification. Every flagged pair still goes to human review
// (see data-adapter.js's duplicate_flagged status).

const HASH_GRID_SIZE = 8; // 8x8 = 64-bit hash, the standard aHash size

// pixels: a flat array of HASH_GRID_SIZE*HASH_GRID_SIZE grayscale values
// (0-255), already resized/grayscaled by the caller. Pure function, no DOM.
function averageHashFromGrayscalePixels(pixels) {
  const n = HASH_GRID_SIZE * HASH_GRID_SIZE;
  if (pixels.length !== n) throw new Error("expected " + n + " grayscale pixels, got " + pixels.length);
  const avg = pixels.reduce((a, b) => a + b, 0) / n;
  let hex = "";
  for (let i = 0; i < n; i += 4) {
    let nibble = 0;
    for (let b = 0; b < 4; b++) {
      nibble = (nibble << 1) | (pixels[i + b] >= avg ? 1 : 0);
    }
    hex += nibble.toString(16);
  }
  return hex;
}

function hammingDistanceHex(hashA, hashB) {
  if (hashA.length !== hashB.length) throw new Error("hash length mismatch");
  let dist = 0;
  for (let i = 0; i < hashA.length; i++) {
    let x = parseInt(hashA[i], 16) ^ parseInt(hashB[i], 16);
    while (x) { dist += x & 1; x >>= 1; }
  }
  return dist;
}

// Out of a 64-bit hash, a distance this low or lower is treated as "likely
// the same screenshot." This is a starting assumption, not a validated
// threshold -- tune it after seeing real submission data (see
// DELIVERABLES.md's "observations to collect").
const DUPLICATE_HASH_THRESHOLD = 10;

function isLikelyDuplicateHash(hashA, hashB) {
  return hammingDistanceHex(hashA, hashB) <= DUPLICATE_HASH_THRESHOLD;
}

// DOM-dependent wrapper: takes a File (from <input type="file">), draws it
// to an offscreen canvas at HASH_GRID_SIZE x HASH_GRID_SIZE, grayscales it,
// and returns the aHash. The raw image is never persisted anywhere by this
// function -- the canvas and object URL are discarded once the hash is
// computed, per the data-minimization requirement in SCHEMA.md/CLAUDE
// instructions.
async function computeImageHashFromFile(file) {
  const dataUrl = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
  const img = await new Promise((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = reject;
    el.src = dataUrl;
  });
  const canvas = document.createElement("canvas");
  canvas.width = HASH_GRID_SIZE;
  canvas.height = HASH_GRID_SIZE;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(img, 0, 0, HASH_GRID_SIZE, HASH_GRID_SIZE);
  const imageData = ctx.getImageData(0, 0, HASH_GRID_SIZE, HASH_GRID_SIZE).data;
  const gray = [];
  for (let i = 0; i < imageData.length; i += 4) {
    gray.push(Math.round(0.299 * imageData[i] + 0.587 * imageData[i + 1] + 0.114 * imageData[i + 2]));
  }
  return averageHashFromGrayscalePixels(gray);
}

// ============================================================
// Milestones / badges
// ============================================================
//
// All of these are computed only from timestamps the app actually records
// (trackingStartedAt, ballotArrivedSelfReportedAt, confirmedAt) -- never
// from an invented or inferred time. If a needed timestamp is missing, the
// badge simply isn't awarded; it is never guessed.

const EARLY_BIRD_WINDOW_DAYS = 3; // adjustable starting assumption, see DELIVERABLES.md
const NEIGHBORHOOD_COMPLETE_MIN_PARTICIPANTS = 5; // avoid a 1-person "neighborhood" trivially completing

function daysBetween(isoA, isoB) {
  return (new Date(isoB) - new Date(isoA)) / 86400000;
}

// participant: Participant record. rankAmongConfirmed: 1-based rank of this
// participant's confirmedAt among all confirmed participants in their
// neighborhood (lower = earlier), or null if not confirmed/not computable.
function computeParticipantBadges(participant, rankAmongConfirmed) {
  const badges = [];
  if (participant.status !== "counted" || !participant.confirmedAt) return badges;

  if (participant.ballotArrivedSelfReportedAt) {
    const days = daysBetween(participant.ballotArrivedSelfReportedAt, participant.confirmedAt);
    if (days >= 0 && days <= EARLY_BIRD_WINDOW_DAYS) badges.push("early_bird");
  }

  if (rankAmongConfirmed !== null && rankAmongConfirmed !== undefined && rankAmongConfirmed <= 100) {
    badges.push("first_100");
  }

  return badges;
}

// neighborhoodStats: { participantCount, confirmedCount } from the
// leaderboard. Returns an array of milestone keys newly crossed, given the
// stats *before* this confirmation and *after* it -- so the UI can
// celebrate exactly the thresholds just reached, not re-announce old ones.
function computeNeighborhoodMilestones(statsBefore, statsAfter) {
  const milestones = [];
  const thresholds = [0.25, 0.5, 0.75];
  const rateBefore = statsBefore.participantCount > 0 ? statsBefore.confirmedCount / statsBefore.participantCount : 0;
  const rateAfter = statsAfter.participantCount > 0 ? statsAfter.confirmedCount / statsAfter.participantCount : 0;

  thresholds.forEach(t => {
    if (rateBefore < t && rateAfter >= t) milestones.push("milestone_" + Math.round(t * 100));
  });

  const completeBefore = statsBefore.participantCount >= NEIGHBORHOOD_COMPLETE_MIN_PARTICIPANTS &&
    statsBefore.confirmedCount === statsBefore.participantCount;
  const completeAfter = statsAfter.participantCount >= NEIGHBORHOOD_COMPLETE_MIN_PARTICIPANTS &&
    statsAfter.confirmedCount === statsAfter.participantCount;
  if (!completeBefore && completeAfter) milestones.push("neighborhood_complete");

  return milestones;
}

// ============================================================
// Leaderboard presentation
// ============================================================
//
// "Highest participation" is only meaningful with enough participants to
// not be dominated by a neighborhood of 1-2 people hitting 100%. This
// filters the rate leaderboard to neighborhoods past a minimum size --
// it does NOT hide small neighborhoods from the "most confirmed" board.

const MIN_PARTICIPANTS_FOR_RATE_LEADERBOARD = 3;

function sortByMostConfirmed(rows) {
  return rows.slice().sort((a, b) => b.confirmedCount - a.confirmedCount);
}

function sortByHighestParticipation(rows) {
  return rows
    .filter(r => r.participantCount >= MIN_PARTICIPANTS_FOR_RATE_LEADERBOARD)
    .sort((a, b) => b.participationRate - a.participationRate);
}

// ============================================================
// Node/browser export shim
// ============================================================
// This repo has no bundler (see CLAUDE.md). In the browser these are plain
// globals, loaded via <script src="app.js">. In Node (for tests) we also
// attach them to module.exports when it exists, without needing a build
// step either way.
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    averageHashFromGrayscalePixels,
    hammingDistanceHex,
    isLikelyDuplicateHash,
    DUPLICATE_HASH_THRESHOLD,
    computeParticipantBadges,
    computeNeighborhoodMilestones,
    sortByMostConfirmed,
    sortByHighestParticipation,
    MIN_PARTICIPANTS_FOR_RATE_LEADERBOARD,
    EARLY_BIRD_WINDOW_DAYS,
    NEIGHBORHOOD_COMPLETE_MIN_PARTICIPANTS
  };
}
