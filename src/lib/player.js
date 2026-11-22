import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot, setDoc, updateDoc, increment, serverTimestamp } from "firebase/firestore";
import { auth, db } from "./firebase";

// Who is logged in (undefined = still checking, null = nobody).
export function useAuthUser() {
  const [user, setUser] = useState(undefined);
  useEffect(() => onAuthStateChanged(auth, setUser), []);
  return user;
}

// Live player document: players/{uid}. Created on first login.
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
          await setDoc(ref, { coins: 0, xp: 0, level: 1, createdAt: serverTimestamp() });
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
