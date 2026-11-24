// Tips and ideas from players, to Edward. Stored in feedback/{id}: anyone signed in can send one,
// nobody can read them in the app (read them in the Firebase console, Firestore > feedback).
import { Platform } from "react-native";
import Constants from "expo-constants";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";

export const FEEDBACK_KINDS = ["idea", "problem", "other"];
export const FEEDBACK_MAX = 1000;

export function sendFeedback(uid, name, kind, text) {
  return addDoc(collection(db, "feedback"), {
    uid,
    name: name ?? "Player",
    kind,
    text: text.trim().slice(0, FEEDBACK_MAX),
    app: Constants.expoConfig?.version ?? null,
    platform: Platform.OS,
    at: serverTimestamp(),
  });
}
