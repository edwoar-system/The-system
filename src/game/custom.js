// Skills you add yourself, when the Guild doesn't have yours yet.
// The System builds the skill from a few answers (name, stat, kind, minutes) using a general ladder,
// then adds it to the Guild lists so it works everywhere: quests, ranks, the skill page, friends.
import { GUILD, skillById } from "./guild";
import { LADDERS, ladderById } from "./ladders";

export const CUSTOM_KINDS = ["sport", "knowledge", "craft", "habit"];
export const CUSTOM_MINUTES = [10, 20, 30, 45, 60];

// A general ladder per kind: hours of practice plus a proof of level. Habits count days, like other habits.
const RANKS_BY_KIND = {
  sport: ["Your first session", "10 hours practised; the basic moves on your own", "30 hours; the basics are easy and clean", "80 hours; you hold your own with experienced people", "200 hours; strong club level", "500 hours; competing well", "National level", "World level"],
  knowledge: ["Your first session", "10 hours; you know the basic words and ideas", "30 hours; you can explain the basics to someone", "80 hours; you can use it without help", "200 hours; you can teach it", "500 hours; expert-level work or exam", "Recognised expert", "World level"],
  craft: ["Your first piece", "10 hours; three small pieces finished", "30 hours; a piece you'd show someone", "80 hours; people ask you how you did it", "200 hours; work good enough to sell or exhibit", "500 hours; a real portfolio", "Professional level", "World level"],
};
const TRIALS_BY_KIND = {
  sport: { D: "Film one full session and watch it back", C: "Train or play with someone better than you", B: "Finish a 4-week plan you set yourself; film your best attempt", A: "Take part in a competition or event", S: "Place in a competition at regional level or higher" },
  knowledge: { D: "Explain the basics to someone in 5 minutes", C: "Do a test, quiz or exam paper without notes", B: "Teach someone a full lesson", A: "Pass an exam or certificate, or publish something", S: "Win a competition or get a recognised qualification" },
  craft: { D: "Finish a piece and show it to someone", C: "Make a piece from start to finish in one week", B: "Finish a project of 10 hours or more", A: "Sell, exhibit or publish your work", S: "Get your work chosen for a show, competition or client" },
};

// Text a search looks through for a skill (name, id, other words for it).
export const searchText = (sk) => `${sk.id} ${sk.name} ${sk.quest} ${sk.counts ?? ""} ${ALIASES[sk.id] ?? ""}`.toLowerCase();

export const customId = (name) => `c_${String(name).toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 24) || "skill"}`;

// What gets saved in players/{uid}.customSkills[id].
export function buildCustom({ name, stat, kind, minutes, counts }) {
  const clean = String(name).trim().replace(/\s+/g, " ").slice(0, 40);
  const title = clean.charAt(0).toUpperCase() + clean.slice(1);
  return { name: title, stat, kind, minutes, counts: String(counts ?? "").trim().slice(0, 140) };
}

// Adds saved custom skills to the Guild lists (safe to call often; updates in place).
export function registerCustomSkills(custom = {}) {
  for (const [id, c] of Object.entries(custom ?? {})) {
    if (!c?.name || !GUILD[c.stat]) continue;
    const old = skillById[id];
    if (old && !old.custom) continue; // never overwrite a built-in skill
    const habit = c.kind === "habit";
    const sk = {
      id, stat: c.stat, name: c.name, custom: true,
      quest: habit ? `${c.name} today` : `${c.minutes} min of ${c.name.toLowerCase()}`,
      counts: c.counts || (habit ? "Done today, honestly." : "Focused practice, phone away."),
      minutes: c.minutes ?? 30, difficulty: (c.minutes ?? 30) >= 45 ? "hard" : (c.minutes ?? 30) <= 10 ? "easy" : "normal",
      type: c.kind === "sport" ? "sport" : c.kind === "knowledge" ? "study" : c.kind === "craft" ? "skill" : "habit", kind: "simple",
    };
    const ladder = habit
      ? { id, stat: c.stat, stats: c.stat, basis: "habit", freq: "daily", custom: true, note: "Your own habit. The rank comes from how many days you do it.",
        target: `${c.name}, every day.`, trials: { D: "14 days without missing twice in a row", C: "30 of 30 days", B: "8 weeks kept, and you helped someone start it too" },
        quests: sk.quest, earn: sk.quest, test: "Days logged.", proof: "honour" }
      : { id, stat: c.stat, stats: c.stat, basis: "milestone", custom: true, note: "Your own skill. The System uses a general ladder: hours of practice, plus a proof of level for the higher ranks.",
        col: "Level", ranks: RANKS_BY_KIND[c.kind] ?? RANKS_BY_KIND.sport, trials: TRIALS_BY_KIND[c.kind] ?? TRIALS_BY_KIND.sport,
        quests: sk.quest, earn: `One session of ${sk.minutes} minutes.`, test: "Your word, or a video or photo of your work.", proof: "honour" };
    if (old) {
      Object.assign(old, sk);
      Object.assign(ladderById[id], ladder);
      continue;
    }
    GUILD[c.stat].push(sk);
    skillById[id] = sk;
    LADDERS.push(ladder);
    ladderById[id] = ladder;
  }
}

// ── Search help: "did you mean…" ──────────────────────────────────────────────

// Other words people use for a skill.
const ALIASES = {
  gym: "weights weightlifting lifting fitness", running: "run jogging jog marathon", boulder: "climbing climb rock", swim: "swimming",
  cycle: "bike biking cycling", boxing: "fight fighting kickboxing mma martial", study: "school homework exam", reading: "read books book",
  japanese: "japan kana hiragana", snowboard: "snowboarding snow", ski: "skiing", skate: "skating skateboard", stretch: "flexibility mobility splits",
  meditation: "meditate mindfulness", coldshower: "cold", water: "drink hydration food diet", sleep: "bed", windsurf: "surfing wind",
  music: "guitar piano drums singing sing instrument violin bass ukulele", crafts: "draw drawing art paint painting sketch", coding: "code programming python javascript app",
  writing: "write essay story blog", maths: "math mathematics algebra", spanish: "espanol", mandarin: "chinese", cook: "cooking baking", breath: "breathing breathwork",
  speaking: "presentation speech talk", docu: "documentary lecture podcast", gratitude: "thankful",
};

function editDistance(a, b) {
  const m = a.length; const n = b.length;
  if (!m) return n; if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[n];
}

// Close matches for a search that found nothing (typos, other words). Best first, at most `max`.
export function similarSkills(query, max = 3) {
  const q = String(query).toLowerCase().trim();
  if (q.length < 2) return [];
  const scored = Object.values(skillById).map((sk) => {
    const words = `${sk.name} ${sk.id} ${ALIASES[sk.id] ?? ""}`.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
    let best = Infinity;
    for (const w of words) {
      if (w.startsWith(q) || q.startsWith(w) && w.length >= 3) best = Math.min(best, 0);
      const d = editDistance(q, w.slice(0, Math.max(q.length, Math.min(w.length, q.length + 2))));
      best = Math.min(best, d / Math.max(q.length, 1));
    }
    return { sk, score: best };
  });
  return scored.filter((x) => x.score <= 0.34).sort((a, b) => a.score - b.score).slice(0, max).map((x) => x.sk);
}
