// Wikipedia for the Learn tab: search, and an article as plain text split into sections.
// origin=* lets the website call the API from the browser (CORS); the app calls it directly.
const API = "https://en.wikipedia.org/w/api.php";
const SKIP = ["See also", "References", "External links", "Notes", "Further reading", "Bibliography", "Sources", "Citations", "Footnotes"];

// Built by hand: React Native's URLSearchParams is incomplete.
const url = (params) => `${API}?${Object.entries({ format: "json", origin: "*", ...params }).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&")}`;
const strip = (html) => String(html ?? "").replace(/<[^>]+>/g, "").replace(/&quot;/g, "\"").replace(/&amp;/g, "&").replace(/&#039;/g, "'");

// Up to 8 results: [{ title, snippet }].
export async function wikiSearch(q) {
  const res = await fetch(url({ action: "query", list: "search", srsearch: q, srlimit: "8" }));
  if (!res.ok) throw new Error("wiki-failed");
  const data = await res.json();
  return (data.query?.search ?? []).map((r) => ({ title: r.title, snippet: strip(r.snippet) }));
}

// An article: { title, description, image, intro, sections: [{ title, level, text }], url }.
export async function wikiArticle(title) {
  const res = await fetch(url({ action: "query", prop: "extracts|pageimages|description", explaintext: "1", exsectionformat: "wiki", redirects: "1", pithumbsize: "640", titles: title }));
  if (!res.ok) throw new Error("wiki-failed");
  const data = await res.json();
  const page = Object.values(data.query?.pages ?? {})[0];
  if (!page || page.missing != null) throw new Error("wiki-missing");
  const sections = [];
  let cur = { title: null, level: 1, lines: [] };
  for (const raw of String(page.extract ?? "").split("\n")) {
    const m = raw.match(/^(={2,4})\s*(.+?)\s*\1$/);
    if (m) { sections.push(cur); cur = { title: m[2], level: m[1].length, lines: [] }; } else if (raw.trim()) cur.lines.push(raw.trim());
  }
  sections.push(cur);
  // Drop reference lists, and headings with nothing under them.
  let skipping = false;
  const kept = [];
  for (const s of sections) {
    if (s.level === 2) skipping = SKIP.includes(s.title);
    if (!skipping && s.lines.length) kept.push({ title: s.title, level: s.level, text: s.lines.join("\n\n") });
  }
  const intro = kept[0]?.title == null ? kept.shift()?.text ?? "" : "";
  return {
    title: page.title,
    description: page.description ?? "",
    image: page.thumbnail?.source ?? null,
    intro,
    sections: kept,
    url: `https://en.wikipedia.org/wiki/${encodeURIComponent(page.title.replace(/ /g, "_"))}`,
  };
}

export const webSearchUrl = (q) => `https://www.google.com/search?q=${encodeURIComponent(q)}`;
