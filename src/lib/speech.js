// The phone (or the browser) says a word out loud, in the course's language.
// expo-speech is loaded only when first needed: app builds without it (1.5.0 and older) just stay silent.
import { Platform } from "react-native";

let mod;
function S() {
  if (mod !== undefined) return mod;
  try {
    // An app build without the speech part has the JS but not the native side: check for it first.
    if (Platform.OS !== "web" && !require("expo").requireOptionalNativeModule("ExpoSpeech")) {
      mod = null;
      return mod;
    }
    mod = require("expo-speech");
    if (!mod?.speak) mod = null;
  } catch {
    mod = null;
  }
  return mod;
}

export const canSpeak = () => !!S();

export function say(text, language, rate = 0.85) {
  const m = S();
  if (!m || !text) return false;
  try {
    m.stop?.();
    m.speak(text, { language, rate });
    return true;
  } catch {
    return false;
  }
}
