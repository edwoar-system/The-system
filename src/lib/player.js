import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { arrayRemove, arrayUnion, deleteField, doc, onSnapshot, setDoc, updateDoc, increment, serverTimestamp } from "firebase/firestore";
import { auth, db } from "./firebase";

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
        setState({ player: snap.data(), error: null, synced: !snap.metadata.hasPendingWrites });
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
export function lockSetup(uid, { urgentPerDay, penaltySeverity }) {
  return updateDoc(doc(db, "players", uid), { urgentPerDay, penaltySeverity, setupLocked: true, setupLockedAt: serverTimestamp(), updatedAt: serverTimestamp() });
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
// The quick-log buttons you pinned (ids from game/quick.js).
export function setQuickPins(uid, pins) {
  return updateDoc(doc(db, "players", uid), { quickPins: pins, updatedAt: serverTimestamp() });
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
