import en from "./en";

// All UI text lives in language files. English is the default; more languages can be added later.
const languages = { en };
let current = "en";

export function setLanguage(code) {
  if (languages[code]) current = code;
}

export const t = new Proxy({}, { get: (_, key) => languages[current][key] ?? languages.en[key] });
