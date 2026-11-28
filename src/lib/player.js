import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { arrayRemove, arrayUnion, deleteField, doc, onSnapshot, setDoc, updateDoc, increment, serverTimestamp } from "firebase/firestore";
import { auth, db } from "./firebase";
import { registerCustomSkills } from "../game/custom";
import { todayKey } from "../game/quests";

// Who is logged in (undefined = still checking, null = nobody).
export function useAuthUser() {
  const [user, setUser] = useState(undefined);
  useEffect(() => onAuthStateChanged(auth, setUser), []);
  return user;
}

export function createPlayer(uid, name) {
  return setDoc(
    doc(db, "players", uid),
    { name: name || null, coins: 0, xp: 0, level: 1, createdAt: serverTimestamp() },
    { merge: true }
  );
}

// Live player document: players/{uid}. Created on first login if missing.
export function usePlayer(uid) {
  const [state, setState] = useState({ player: null, error: null, synced: false });
  useEffect(() => {
    if (!uid) return;
    const ref = doc(db, "players", uid);
    return onSnapshot(
      ref,
      { includeMetadataChanges: true },
      async (snap) => {
        if (!snap.exists()) {
          await createPlayer(uid, null);
          return;
        }
        const data = snap.data();
        registerCustomSkills(data.customSkills); // your own skills join the Guild lists before anything reads them
        setState({ player: data, error: null, synced: !snap.metadata.hasPendingWrites });
      },
      (error) => setState((s) => ({ ...s, error: error.message }))
    );
  }, [uid]);
  return state;
}

export function addCoins(uid, amount) {
  return updateDoc(doc(db, "players", uid), { coins: increment(amount), updatedAt: serverTimestamp() });
}

export function setPlayerName(uid, name) {
  return updateDoc(doc(db, "players", uid), { name, updatedAt: serverTimestamp() });
}

// First-time setup: urgent quests per day and the penalty severity, locked in together.
export function lockSetup(uid, { penaltySeverity }) {
  return updateDoc(doc(db, "players", uid), { penaltySeverity, setupLocked: true, setupLockedAt: serverTimestamp(), updatedAt: serverTimestamp() });
}

// Profile info for fair rank norms: age, sex and bodyweight (all optional).
export function setProfile(uid, profile) {
  return updateDoc(doc(db, "players", uid), { profile, updatedAt: serverTimestamp() });
}

// Turns proof on or off for one kind of quest ("trial", "urgent", "main", "guild").
export function setProof(uid, kind, on) {
  return updateDoc(doc(db, "players", uid), { [`proof.${kind}`]: on, updatedAt: serverTimestamp() });
}

// Star or unstar a quote (starred quotes come back more often).
export function toggleFavQuote(uid, id, on) {
  return updateDoc(doc(db, "players", uid), { favQuotes: on ? arrayUnion(id) : arrayRemove(id), updatedAt: serverTimestamp() });
}

// Vibration or sound on or off.
export function setFeelSetting(uid, key, on) {
  return updateDoc(doc(db, "players", uid), { [`feel.${key}`]: on, updatedAt: serverTimestamp() });
}

// What friends can see ("stats", "skills", "streak", "today", "honesty").
export function setPrivacy(uid, key, on) {
  return updateDoc(doc(db, "players", uid), { [`privacy.${key}`]: on, updatedAt: serverTimestamp() });
}

// Saves one part of the questionnaire: only the given fields change (null removes one).
export function patchProfile(uid, patch) {
  const fields = Object.fromEntries(Object.entries(patch).map(([k, v]) => [`profile.${k}`, v ?? deleteField()]));
  return updateDoc(doc(db, "players", uid), { ...fields, updatedAt: serverTimestamp() });
}

// Turns one kind of notification on or off (see game/notify.js).
// A reminder ticked off for today (it stops alerting and shows as done).
export function tickReminder(uid, player, id) {
  const today = todayKey();
  const ids = player?.reminderDone?.date === today ? player.reminderDone.ids ?? [] : [];
  return updateDoc(doc(db, "players", uid), { reminderDone: { date: today, ids: [...new Set([...ids, id])] }, updatedAt: serverTimestamp() });
}

// A skill you made yourself (game/custom.js).
export function saveCustomSkill(uid, id, data) {
  return updateDoc(doc(db, "players", uid), { [`customSkills.${id}`]: data, updatedAt: serverTimestamp() });
}

// Your morning: items, the daily challenge on/off, the check-in on/off.
export function setMorning(uid, morning) {
  return updateDoc(doc(db, "players", uid), { morning, updatedAt: serverTimestamp() });
}

// Plan a skill on fixed weekdays at a time (game/weekplan.js); null removes the plan.
export function setWeekPlan(uid, skill, plan) {
  return updateDoc(doc(db, "players", uid), { [`weekPlan.${skill}`]: plan ?? deleteField(), updatedAt: serverTimestamp() });
}

// The quick-log buttons you pinned (ids from game/quick.js).
export function setQuickPins(uid, pins) {
  return updateDoc(doc(db, "players", uid), { quickPins: pins, updatedAt: serverTimestamp() });
}

// Notification voice (game/voice.js).
export function setVoice(uid, voice) {
  return updateDoc(doc(db, "players", uid), { voice, updatedAt: serverTimestamp() });
}

// Do you have what this skill needs (game/gear.js)? true / false.
export function setGear(uid, skill, has) {
  return updateDoc(doc(db, "players", uid), { [`profile.gear.${skill}`]: has, updatedAt: serverTimestamp() });
}

export function setSimple(uid, on) {
  return updateDoc(doc(db, "players", uid), { simple: !!on, updatedAt: serverTimestamp() });
}

export function setDifficulty(uid, d) {
  return updateDoc(doc(db, "players", uid), { difficulty: d, updatedAt: serverTimestamp() });
}

export function setNotify(uid, kind, on) {
  return updateDoc(doc(db, "players", uid), { [`notify.${kind}`]: on, updatedAt: serverTimestamp() });
}

// Your own reminders: { id, text, time "HH:MM", repeat "daily" | "once", date (for once) }.
export function setReminders(uid, reminders) {
  return updateDoc(doc(db, "players", uid), { reminders, updatedAt: serverTimestamp() });
}
