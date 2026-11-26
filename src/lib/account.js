// Delete your account: everything the app stored about you, then the login itself.
// Order: your friends' links to you, your public card and its requests/trolls, your friend code,
// your player data (log, sent, courses, proof), and last the login (Firebase asks for your password again).
import { EmailAuthProvider, deleteUser, reauthenticateWithCredential } from "firebase/auth";
import { collection, deleteDoc, doc, getDoc, getDocs, writeBatch } from "firebase/firestore";
import { auth, db } from "./firebase";
import { friendCode } from "../game/social";

async function clear(path) {
  const snap = await getDocs(collection(db, ...path));
  for (let i = 0; i < snap.docs.length; i += 400) {
    const batch = writeBatch(db);
    snap.docs.slice(i, i + 400).forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
  return snap.docs;
}

export async function deleteAccount(password) {
  const user = auth.currentUser;
  if (!user) throw new Error("no-user");
  // Firebase only deletes a login that signed in recently: confirm the password first.
  await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, password));
  const uid = user.uid;
  const soft = (p) => p.catch(() => null); // one piece failing shouldn't stop the rest

  // Friends: remove you from their list, then your own list.
  const friends = await soft(clear(["public", uid, "friends"]));
  for (const f of friends ?? []) await soft(deleteDoc(doc(db, "public", f.id, "friends", uid)));
  await soft(clear(["public", uid, "requests"]));
  await soft(clear(["public", uid, "trolls"]));
  await soft(deleteDoc(doc(db, "public", uid)));
  // Your friend code (one of a few salts).
  for (let salt = 0; salt < 5; salt++) {
    const ref = doc(db, "codes", friendCode(uid, salt));
    const snap = await soft(getDoc(ref));
    if (snap?.exists() && snap.data().uid === uid) await soft(deleteDoc(ref));
  }
  for (const sub of ["log", "sent", "courses", "proof"]) await soft(clear(["players", uid, sub]));
  await deleteDoc(doc(db, "players", uid));
  await deleteUser(user);
}
