// "Why now": a hard quest comes with a reason to start it right away and a quote to go with it.
// Short and concrete: what this kind of work does for you, and why later is worse than now.
import { QUOTES } from "./quotes";

const WHY = {
  body: [
    "Strength is built on the days you don't feel like it. Twenty minutes now beats a perfect plan tomorrow.",
    "Your body adapts to what you ask of it. Ask today, and it answers by next week.",
    "The first set is the hardest part. Start it, and the rest follows.",
    "Every hard session is proof to yourself that you keep your word.",
  ],
  cardio: [
    "Your heart and lungs get stronger every time you push them. Go while there's still light in the day.",
    "Ten minutes in, you won't want to stop. The hard part is the shoes.",
    "Endurance is just showing up again. Show up now.",
  ],
  mind: [
    "Focus is a muscle too. Train it when it's hard: that's when it grows.",
    "Ten quiet minutes now buy you a calmer rest of the day.",
    "The urge to skip this is exactly what this trains.",
  ],
  study: [
    "Twenty-five focused minutes now are worth two distracted hours tonight.",
    "What you learn today, you won't have to cram tomorrow.",
    "Start with the hardest part while your head is fresh.",
  ],
  social: [
    "The courage you use now makes the next time easier.",
    "People remember who showed up. Be that person today.",
  ],
  skill: [
    "Skill is repetition with attention. Get your reps in today.",
    "You're one session closer to the next rank. Don't let it rust.",
  ],
};
const GROUP = {
  workout: "body", gym: "body", climb: "body", sport: "body", program: "body", cold: "body",
  cardio: "cardio", walk: "cardio",
  mind: "mind", journal: "mind", philo: "mind", sleep: "mind",
  study: "study", reading: "study", language: "study", chess: "study",
  social: "social",
};

function hash(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

// Quests that get a "why now": hard ones, long ones (45+ min) and urgent ones.
export const needsWhy = (q) => !!q && (q.difficulty === "hard" || (q.minutes ?? 0) >= 45 || q.urgent);

// { line, quote } for this quest; the same quest on the same day keeps the same words.
export function whyNow(q, seed = "") {
  const list = WHY[GROUP[q?.type] ?? "skill"];
  const h = hash(`${q?.id ?? q?.title ?? ""}:${seed}`);
  const pool = QUOTES.filter((x) => ["stoicism", "warrior", "greek"].includes(x.school));
  const quotes = pool.length ? pool : QUOTES;
  return { line: list[h % list.length], quote: quotes[(h >>> 8) % quotes.length] };
}
