// Proof photos. Stored small (about 900 px wide, compressed JPEG) in Firestore under
// players/{uid}/proof/{logId}, so no paid storage plan is needed.
import * as ImagePicker from "expo-image-picker";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "./firebase";

const WIDTH = 900;

// source: "camera" | "library". Returns a data URI, or null when cancelled or not allowed.
export async function pickProof(source) {
  if (source === "camera") {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted && perm.status !== "undetermined") return { denied: true };
  }
  const opts = { mediaTypes: "images", quality: 1 };
  const res = source === "camera" ? await ImagePicker.launchCameraAsync(opts) : await ImagePicker.launchImageLibraryAsync(opts);
  if (!res || res.canceled || !res.assets?.length) return null;
  const a = res.assets[0];
  const ctx = ImageManipulator.manipulate(a.uri);
  if (a.width > WIDTH) ctx.resize({ width: WIDTH, height: null });
  const img = await ctx.renderAsync();
  const out = await img.saveAsync({ format: SaveFormat.JPEG, compress: 0.55, base64: true });
  return { uri: `data:image/jpeg;base64,${out.base64}` };
}

// Saves the photo (or "none" when skipped) on the quest log entry.
export async function saveProof(uid, logId, uri) {
  const log = doc(db, "players", uid, "log", logId);
  if (!uri) return setDoc(log, { proof: "none" }, { merge: true });
  await setDoc(doc(db, "players", uid, "proof", logId), { image: uri, at: serverTimestamp() });
  return setDoc(log, { proof: "photo" }, { merge: true });
}

export async function loadProof(uid, logId) {
  const snap = await getDoc(doc(db, "players", uid, "proof", logId));
  return snap.exists() ? snap.data().image : null;
}
