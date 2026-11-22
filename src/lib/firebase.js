import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { firebaseConfig } from "./firebase-config";
import { createAuth } from "./auth";

export const app = getApps()[0] ?? initializeApp(firebaseConfig);
export const auth = createAuth(app);
export const db = getFirestore(app);
