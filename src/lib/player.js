import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { deleteField, doc, onSnapshot, setDoc, updateDoc, increment, serverTimestamp } from "firebase/firestore";
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

// Saves one part of the questionnaire: only the given fields change (null removes one).
export function patchProfile(uid, patch) {
  const fields = Object.fromEntries(Object.entries(patch).map(([k, v]) => [`profile.${k}`, v ?? deleteField()]));
  return updateDoc(doc(db, "players", uid), { ...fields, updatedAt: serverTimestamp() });
}

// Turns one kind of notification on or off (see game/notify.js).
export function setNotify(uid, kind, on) {
  return updateDoc(doc(db, "players", uid), { [`notify.${kind}`]: on, updatedAt: serverTimestamp() });
}

// Your own reminders: { id, text, time "HH:MM", repeat "daily" | "once", date (for once) }.
export function setReminders(uid, reminders) {
  return updateDoc(doc(db, "players", uid), { reminders, updatedAt: serverTimestamp() });
}
