// Party quests with friends.
//   Group quest: one quest for today; everyone does their own part. Your part pays like a normal quest,
//   and when the whole party is done, everyone gets a bonus on top.
//   Raid: a shared goal over a few days, like running 30 km together. Everyone's progress adds up on one bar;
//   if the party reaches it in time, everyone gets the raid reward.
// Parties are 2 to 5 players (you plus up to 4 friends). Logging is on your honour, like everything else.
import { questCoins, questXp } from "./economy";

export const MAX_PARTY = 5;
export const GROUP_BONUS = 0.5; // +50% of the quest's coins when everyone finished
export const RAID_DAYS = [3, 5, 7];

export const GROUP_QUESTS = [
  { id: "run5", stat: "AGI", minutes: 35, difficulty: "hard", title: "Run 5 km" },
  { id: "walk45", stat: "VIT", minutes: 45, difficulty: "easy", title: "Walk 45 minutes outside" },
  { id: "push100", stat: "STR", minutes: 20, difficulty: "hard", title: "100 push-ups, any sets" },
  { id: "squat150", stat: "STR", minutes: 20, difficulty: "normal", title: "150 squats, any sets" },
  { id: "cold", stat: "VIT", minutes: 5, difficulty: "hard", title: "Cold shower, 2 minutes" },
  { id: "study60", stat: "INT", minutes: 60, difficulty: "normal", title: "One focused hour of study" },
  { id: "read30", stat: "INT", minutes: 30, difficulty: "easy", title: "Read for 30 minutes" },
  { id: "nophone2", stat: "WIL", minutes: 120, difficulty: "hard", title: "Two hours phone-free" },
  { id: "meditate", stat: "WIL", minutes: 15, difficulty: "normal", title: "Meditate 15 minutes" },
  { id: "kind", stat: "CHA", minutes: 10, difficulty: "easy", title: "Do something kind for someone" },
];
export const groupById = Object.fromEntries(GROUP_QUESTS.map((q) => [q.id, q]));

// perMember: the goal grows with the party. reward: coins and EXP each when the raid is cleared.
export const RAIDS = [
  { id: "runKm", stat: "AGI", unit: "km", perMember: 10, step: 1, reward: 40, title: "Run together" },
  { id: "walkKm", stat: "VIT", unit: "km", perMember: 20, step: 1, reward: 30, title: "Walk together" },
  { id: "pushups", stat: "STR", unit: "push-ups", perMember: 300, step: 10, reward: 35, title: "Push-up raid" },
  { id: "studyH", stat: "INT", unit: "hours of study", perMember: 5, step: 0.5, reward: 40, title: "Study raid" },
  { id: "readP", stat: "INT", unit: "pages", perMember: 150, step: 5, reward: 30, title: "Reading raid" },
  { id: "meditateM", stat: "WIL", unit: "minutes of meditation", perMember: 60, step: 5, reward: 30, title: "Calm raid" },
];
export const raidById = Object.fromEntries(RAIDS.map((r) => [r.id, r]));

export const groupCoins = (q) => questCoins({ minutes: q.minutes, difficulty: q.difficulty });
export const groupXp = (q) => questXp({ minutes: q.minutes, difficulty: q.difficulty });
export const groupBonus = (q) => Math.round(groupCoins(q) * GROUP_BONUS);

export const raidTarget = (party) => (raidById[party.raid]?.perMember ?? 0) * (party.members?.length ?? 1);
export const raidTotal = (party) => Object.values(party.progress ?? {}).reduce((s, v) => s + (Number(v) || 0), 0);

// Is the party's goal reached?
export function partyCleared(party) {
  if (party.kind === "group") return (party.members ?? []).length > 1 && party.members.every((m) => party.progress?.[m] === true);
  return raidTotal(party) >= raidTarget(party);
}

// Still running (a group quest only on its day, a raid until its end).
export function partyOpen(party, now = Date.now(), today) {
  if (party.kind === "group") return party.date === today;
  return now < (party.endsMs ?? 0);
}

export const daysLeft = (party, now = Date.now()) => Math.max(0, Math.ceil(((party.endsMs ?? now) - now) / 86400000));
