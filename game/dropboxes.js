"use strict";
/*
 * dropboxes.js -- reuses the official, verified drop-box data that already
 * lives in ../index.html, instead of duplicating it. Same technique as
 * priority.html: fetch index.html and extract its `const NAME = {...}`
 * GeoJSON declarations with a brace/string-aware scanner (JSON.parse, no
 * eval), so there is exactly one copy of this data in the whole repo and
 * index.html is never touched to support this. See CLAUDE.md's "Don't
 * duplicate the map page" lesson -- this file exists specifically to avoid
 * repeating that mistake for a third page.
 *
 * Currently only Adams County data is loaded (this prototype is CD-8 /
 * Adams-scoped, same as priority.html). To extend to Weld/Larimer or other
 * counties later, extract weldDropboxData/larimerDropboxData the same way
 * and merge -- the rest of this module doesn't care which county a box
 * came from.
 */

function extractJsonConst(source, varName) {
  const marker = "const " + varName + " = ";
  const start = source.indexOf(marker);
  if (start === -1) throw new Error("Could not find `" + marker + "` in index.html");
  let i = start + marker.length;
  if (source[i] !== "{" && source[i] !== "[") {
    throw new Error("Expected `" + varName + "` to start with { or [ at index.html:" + i);
  }
  const open = source[i];
  const close = open === "{" ? "}" : "]";
  let depth = 0, inString = false, escape = false;
  const jsonStart = i;
  for (; i < source.length; i++) {
    const c = source[i];
    if (inString) {
      if (escape) escape = false;
      else if (c === "\\") escape = true;
      else if (c === '"') inString = false;
      continue;
    }
    if (c === '"') { inString = true; continue; }
    if (c === open) depth++;
    else if (c === close) {
      depth--;
      if (depth === 0) { i++; break; }
    }
  }
  return JSON.parse(source.slice(jsonStart, i));
}

async function loadOfficialDropBoxes() {
  const res = await fetch("../index.html");
  if (!res.ok) throw new Error("Fetching index.html failed: HTTP " + res.status);
  const html = await res.text();
  const cd8Data = extractJsonConst(html, "cd8Data");
  const countiesData = extractJsonConst(html, "countiesData");
  const adamsDropboxData = extractJsonConst(html, "adamsDropboxData");

  // Same exclusion as priority.html: these cities' boxes are outside CD-8
  // (District 6/4). This prototype is CD-8-scoped (see repo CLAUDE.md and
  // the user's spec: "first prototype may use Congressional District 8
  // data"), so they're left out of the drop-box picker entirely rather
  // than shown as a confusing out-of-scope option.
  const OUTSIDE_CD8_CITIES = ["Aurora", "Bennett, Strasburg, Byers"];

  const boxes = adamsDropboxData.features
    .filter(f => !OUTSIDE_CD8_CITIES.includes(f.properties.city))
    .map(f => ({
      name: f.properties.name,
      city: f.properties.city || null,
      county: "Adams",
      lat: f.geometry.coordinates[1],
      lon: f.geometry.coordinates[0],
      // Provenance, per SCHEMA.md -- this is official election data, not
      // game data, and is labeled as such everywhere it's displayed.
      source: "Adams County official GIS / drop-box list (see ../notes.html)",
      sourceDate: "2026-09-06",
      verifiedAt: "2026-09-06"
    }));

  return { cd8Data, countiesData, boxes };
}
