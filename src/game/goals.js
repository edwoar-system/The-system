// Your goals for the coming months or year ("get really good at climbing", "learn Japanese"). Each goal is
// linked to the skills that get you there; those skills come up more often in your main quests and their
// quests say which goal they're for. Pure rules; the form is in components/Tune.js (part "goals").
import { skillById } from "./guild";
import { INTERESTS } from "./profile";

// Only skills you can also find (and untick) under "What you're into".
const LISTED = new Set(INTERESTS.flatMap((g) => g.skills));

export const HORIZONS = ["3m", "6m", "1y"];
export const MAX_GOALS = 8;

// Words in a goal → skills that build it. First match order is kept; the player picks which to link.
const HINTS = [
  [/climb|boulder|mountain|alpin|k2|everest/i, ["boulder", "fingers", "pullups", "grip", "core", "stretch", "zone2"]],
  [/iron ?man|triathlon/i, ["running", "swim", "cycle", "zone2"]],
  [/marathon|run|5k|10k/i, ["running", "zone2", "stretch"]],
  [/swim/i, ["swim"]],
  [/bike|cycl/i, ["cycle"]],
  [/planche|handstand|hspu|calisthenics|front lever|muscle.?up/i, ["handstand", "pushups", "dips", "core", "iso", "pullups"]],
  [/break ?danc|bboy|b-boy|windmill|freeze|power ?move/i, ["breakdance", "handstand", "core", "stretch"]],
  [/flex|split|mobility/i, ["stretch", "yoga"]],
  [/strong|strength|muscle|gym|body/i, ["gym", "pushups", "pullups", "core"]],
  [/box|fight|kickbox|mma|muay/i, ["boxing", "footwork", "rope"]],
  [/snowboard/i, ["snowboard", "balance"]],
  [/ski\b|skiing/i, ["ski", "balance"]],
  [/surf|windsurf/i, ["surf", "windsurf", "balance", "swim"]],
  [/japan/i, ["japanese"]],
  [/spanish|espa/i, ["spanish"]], [/french/i, ["french"]], [/german/i, ["german"]], [/italian/i, ["italian"]],
  [/korean/i, ["korean"]], [/chinese|mandarin/i, ["mandarin"]], [/latin/i, ["latin"]],
  [/philosoph|stoic|wisdom|advice/i, ["philosophy", "reading", "journal", "conversation"]],
  [/mindful|meditat|calm|present/i, ["meditation", "breath", "journal", "silent"]],
  [/screen|phone|social media|instagram|tiktok/i, ["nophone", "silent", "craving"]],
  [/read|book/i, ["reading"]],
  [/code|program|app/i, ["coding"]],
  [/write|writing|poem|poet/i, ["writing", "poetry"]],
  [/chess/i, ["chess"]],
  [/music|guitar|piano|sing/i, ["music"]],
  [/sleep/i, ["sleep", "winddown"]],
  [/skill|impress|trick/i, ["juggling", "cube", "memory", "typing"]],
  [/school|grade|exam|study/i, ["study", "maths"]],
  [/friend|social|people|talk/i, ["conversation", "reachout", "speaking"]],
];

// Any listed skill whose name matches what you type (the search under a goal).
export const searchSkills = (q) => { const s = String(q ?? "").trim().toLowerCase(); return s.length < 2 ? [] : [...LISTED].filter((id) => skillById[id]?.name.toLowerCase().includes(s)).slice(0, 6); };

// Skills that fit a goal's words (only ones that exist), best first.
export function suggestFor(text) {
  const out = [];
  for (const [re, ids] of HINTS) if (re.test(text ?? "")) ids.forEach((id) => { if (skillById[id] && LISTED.has(id) && !out.includes(id)) out.push(id); });
  return out.slice(0, 8);
}

export const goalsOf = (profile) => (Array.isArray(profile?.goals) ? profile.goals.filter((g) => g && String(g.text ?? "").trim()) : []);
// Every skill linked to one of your goals.
export const goalSkills = (profile) => new Set(goalsOf(profile).flatMap((g) => g.skills ?? []));
// The goal a skill is for (the first one that links it).
export const goalFor = (profile, skill) => goalsOf(profile).find((g) => (g.skills ?? []).includes(skill)) ?? null;
