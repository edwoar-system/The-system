// Your location, only while the app is open and only after you turn it on. Used for three things:
//  - your situation (home, school or work, training, travelling, out), so quests fit where you are;
//  - checking you're at the right kind of place for a troll quest (a gym, a pool, a golf course);
//  - the weather where you are.
// Raw positions stay on the phone. Only places you save yourself (home, school or work) go into your player
// document, rounded to about 10 metres.
import { useEffect, useState } from "react";
import { Platform } from "react-native";
import { doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "./firebase";
import { situationFrom } from "../game/situation";

// expo-location is loaded only when it's first needed, so an older app build without it doesn't crash:
// location then just reads as "not available in this version".
let mod;
function L() {
  if (mod !== undefined) return mod;
  try {
    mod = require("expo-location");
    if (Platform.OS !== "web" && !mod?.getCurrentPositionAsync) mod = null;
  } catch {
    mod = null;
  }
  return mod;
}

// "granted" | "denied" | "undetermined" | "unavailable"
export async function locationPermission() {
  const m = L();
  if (!m) return "unavailable";
  try {
    const p = await m.getForegroundPermissionsAsync();
    return p.granted ? "granted" : p.canAskAgain === false || p.status === "denied" ? "denied" : "undetermined";
  } catch {
    return "unavailable";
  }
}

export async function askLocation() {
  const m = L();
  if (!m) return "unavailable";
  try {
    const p = await m.requestForegroundPermissionsAsync();
    return p.granted ? "granted" : "denied";
  } catch {
    return "unavailable";
  }
}

// One position: { lat, lon, speed (m/s or null), at }. null when not allowed or not available.
let last = null;
let prev = null;
export async function here({ maxAgeMs = 60000 } = {}) {
  if (last && Date.now() - last.at < maxAgeMs) return last;
  const m = L();
  if (!m || (await locationPermission()) !== "granted") return null;
  try {
    const p = await m.getCurrentPositionAsync({ accuracy: m.Accuracy?.Balanced ?? 3 });
    prev = last;
    last = { lat: p.coords.latitude, lon: p.coords.longitude, speed: p.coords.speed ?? null, at: Date.now() };
    return last;
  } catch {
    return null;
  }
}

// ---- Places near you (OpenStreetMap) ----
// kind -> Overpass filters. A place counts when you're within `around` metres of any part of it.
const PLACE_QUERIES = {
  gym: ['nwr["leisure"="fitness_centre"]', 'nwr["leisure"="sports_centre"]'],
  climbing: ['nwr["sport"="climbing"]', 'nwr["leisure"="climbing"]'],
  pool: ['nwr["leisure"="swimming_pool"]["access"!="private"]', 'nwr["sport"="swimming"]', 'nwr["leisure"="water_park"]'],
  library: ['nwr["amenity"="library"]'],
  park: ['nwr["leisure"="park"]', 'nwr["leisure"="nature_reserve"]'],
  golf: ['nwr["leisure"="golf_course"]', 'nwr["golf"="driving_range"]'],
  sport: ['nwr["leisure"="fitness_centre"]', 'nwr["leisure"="sports_centre"]', 'nwr["leisure"="pitch"]', 'nwr["leisure"="stadium"]', 'nwr["leisure"="track"]', 'nwr["leisure"="swimming_pool"]["access"!="private"]', 'nwr["sport"="climbing"]', 'nwr["leisure"="golf_course"]'],
};
const AROUND = { park: 60, golf: 80, sport: 70 };

// Is there a place of this kind where you are? { ok, name } (name of the nearest match, if it has one).
export async function placeNear(kind, pos) {
  const q = PLACE_QUERIES[kind];
  if (!q || !pos) return { ok: false, name: null };
  const r = AROUND[kind] ?? 120;
  const body = `[out:json][timeout:10];(${q.map((f) => `${f}(around:${r},${pos.lat},${pos.lon});`).join("")});out tags 3;`;
  const res = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `data=${encodeURIComponent(body)}`,
  });
  if (!res.ok) throw new Error("places-failed");
  const data = await res.json();
  const els = data.elements ?? [];
  return { ok: els.length > 0, name: els.find((e) => e.tags?.name)?.tags.name ?? null };
}

// For a troll quest: are you at this kind of place right now? { ok, name } or { error }.
export async function checkPlace(kind) {
  const pos = await here({ maxAgeMs: 0 });
  if (!pos) return { error: (await locationPermission()) === "unavailable" ? "unavailable" : "no-permission" };
  try {
    return await placeNear(kind, pos);
  } catch {
    return { error: "places-failed" };
  }
}

// ---- Your saved places and your situation ----
const round = (x) => Math.round(x * 10000) / 10000;
export async function savePlace(uid, which) {
  const pos = await here({ maxAgeMs: 0 });
  if (!pos) throw new Error("no-location");
  await updateDoc(doc(db, "players", uid), { [`places.${which}`]: { lat: round(pos.lat), lon: round(pos.lon) }, updatedAt: serverTimestamp() });
}

let situation = null; // { id, at, auto }
const listeners = new Set();
export const currentSituation = () => situation?.id ?? null;
function setSituation(next) {
  situation = next;
  listeners.forEach((f) => f(next));
}

// Works out your situation now. Training places are looked up at most every 10 minutes.
let sportCache = { at: 0, pos: null, ok: false };
export async function refreshSituation(player) {
  if (situation && !situation.auto && Date.now() - situation.at < 2 * 3600000) return situation; // your own choice holds 2 hours
  const pos = await here({ maxAgeMs: 30000 });
  if (!pos) return situation;
  let sport = sportCache.ok;
  if (Date.now() - sportCache.at > 600000 || !sportCache.pos || Math.abs(sportCache.pos.lat - pos.lat) + Math.abs(sportCache.pos.lon - pos.lon) > 0.001) {
    try { sport = (await placeNear("sport", pos)).ok; sportCache = { at: Date.now(), pos, ok: sport }; } catch { /* keep the last answer */ }
  }
  const id = situationFrom({ pos, prev, places: player?.places, atSport: sport });
  setSituation({ id, at: Date.now(), auto: true });
  return situation;
}

// You can correct it by hand; that holds for two hours.
export function chooseSituation(id) {
  setSituation(id ? { id, at: Date.now(), auto: false } : null);
}

// The situation, refreshed when the app opens and every 5 minutes while it's open.
export function useSituation(player) {
  const [s, setS] = useState(situation);
  const on = !!player?.locationOn;
  useEffect(() => {
    listeners.add(setS);
    return () => listeners.delete(setS);
  }, []);
  useEffect(() => {
    if (!on) return;
    let alive = true;
    const tick = () => { if (alive) refreshSituation(player).catch(() => {}); };
    tick();
    const id = setInterval(tick, 300000);
    return () => { alive = false; clearInterval(id); };
    // The player's saved places matter, not every change to the player.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [on, JSON.stringify(player?.places ?? null)]);
  return on ? s : null;
}

export async function setLocationOn(uid, on) {
  await updateDoc(doc(db, "players", uid), { locationOn: on, updatedAt: serverTimestamp() });
}
