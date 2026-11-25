// Your iPhone Calendar as your agenda. Read only: the System never changes your calendar.
// Today's and tomorrow's events (not all-day ones) become busy time, so quests, urgent quests and reminders
// plan around them. Only the times and titles of those two days go into your player document; the rest
// of your calendar stays on your phone.
import { useEffect } from "react";
import { Platform } from "react-native";
import { doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "./firebase";
import { todayKey } from "../game/quests";

// Loaded only when first needed: app builds without expo-calendar (1.4.0 and older) just read "unavailable".
let mod;
function C() {
  if (mod !== undefined) return mod;
  if (Platform.OS === "web") { mod = null; return mod; } // the iPhone Calendar isn't reachable from a website
  try {
    mod = require("expo-calendar");
    if (!mod?.listEvents || !mod?.getCalendars) mod = null;
  } catch {
    mod = null;
  }
  return mod;
}

// "granted" | "denied" | "undetermined" | "unavailable"
export async function calendarPermission(ask = false) {
  const m = C();
  if (!m) return "unavailable";
  try {
    const p = ask ? await m.requestCalendarPermissions() : await m.getCalendarPermissions();
    return p.granted ? "granted" : p.status === "denied" ? "denied" : "undetermined";
  } catch {
    return "unavailable";
  }
}

// Your calendars: [{ id, title, color }].
export async function listCalendars() {
  const m = C();
  if (!m || (await calendarPermission()) !== "granted") return [];
  const cals = await m.getCalendars(m.EntityTypes?.EVENT ?? "event");
  return cals.map((c) => ({ id: c.id, title: c.title, color: c.color ?? null }));
}

const hourOf = (d) => d.getHours() + d.getMinutes() / 60;
function keyOf(d) {
  return todayKey(d);
}

// Events of today and tomorrow from the calendars you picked (all of them when you picked none),
// as { "<date>": [{ start, end, label }] } in hours. All-day events and "free" events are left out.
export async function readAgenda(ids = null) {
  const m = C();
  if (!m || (await calendarPermission()) !== "granted") return null;
  const cals = ids?.length ? ids : (await listCalendars()).map((c) => c.id);
  if (!cals.length) return {};
  const from = new Date();
  from.setHours(0, 0, 0, 0);
  const to = new Date(from.getTime() + 2 * 86400000);
  const events = await m.listEvents(cals, from, to);
  const out = {};
  events.filter((e) => !e.allDay && e.availability !== "free").forEach((e) => {
    const s = new Date(e.startDate);
    const en = new Date(e.endDate);
    const k = keyOf(s);
    const end = keyOf(en) === k ? hourOf(en) : 24;
    (out[k] = out[k] ?? []).push({ start: Math.round(hourOf(s) * 4) / 4, end: Math.round(end * 4) / 4, label: (e.title ?? "").slice(0, 40) || null });
  });
  Object.values(out).forEach((list) => list.sort((a, b) => a.start - b.start).splice(20));
  return out;
}

// Saves today's and tomorrow's agenda (replacing the old one), so reminders planned on the phone respect it.
export async function syncAgenda(uid, player) {
  if (!player?.calendarOn) return null;
  const agenda = await readAgenda(player.calendarIds ?? null);
  if (!agenda) return null;
  const same = JSON.stringify(agenda) === JSON.stringify(player.calendarBusy ?? {});
  if (!same) await updateDoc(doc(db, "players", uid), { calendarBusy: agenda, updatedAt: serverTimestamp() });
  return agenda;
}

export const setCalendarOn = (uid, on, ids = null) =>
  updateDoc(doc(db, "players", uid), { calendarOn: on, ...(ids ? { calendarIds: ids } : {}), ...(on ? {} : { calendarBusy: {} }), updatedAt: serverTimestamp() });

// Keeps the agenda fresh while the app is open: on open and every 15 minutes.
export function useAgendaSync(uid, player) {
  const on = !!player?.calendarOn;
  useEffect(() => {
    if (!on || !uid) return;
    let alive = true;
    const tick = () => { if (alive) syncAgenda(uid, player).catch(() => {}); };
    tick();
    const id = setInterval(tick, 15 * 60000);
    return () => { alive = false; clearInterval(id); };
    // The calendars you picked matter, not every change to the player.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [on, uid, JSON.stringify(player?.calendarIds ?? null)]);
}

export const agendaToday = (player) => player?.calendarBusy?.[todayKey()] ?? [];
