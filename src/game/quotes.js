// System messages: one line of old wisdom a day, from the four Guild schools.
// Written as short paraphrases in our own words (the sources are ancient texts), with the author and work.
import { todayKey } from "./quests";

export const QUOTES = [
  // Stoicism
  { school: "stoicism", text: "You control your choices, not what happens to you. Spend your strength there.", who: "Epictetus", work: "Enchiridion" },
  { school: "stoicism", text: "When you wake up and don't want to rise, remember you were made to do the work of a human being.", who: "Marcus Aurelius", work: "Meditations" },
  { school: "stoicism", text: "The obstacle in your path becomes the path.", who: "Marcus Aurelius", work: "Meditations" },
  { school: "stoicism", text: "We suffer more in our imagination than in reality.", who: "Seneca", work: "Letters to Lucilius" },
  { school: "stoicism", text: "Life is long enough if you know how to use it. It is wasted, not short.", who: "Seneca", work: "On the Shortness of Life" },
  { school: "stoicism", text: "Stop talking about what a good person is. Be one.", who: "Marcus Aurelius", work: "Meditations" },
  { school: "stoicism", text: "No one is free who is a slave to their own wants.", who: "Seneca", work: "Letters to Lucilius" },
  { school: "stoicism", text: "First decide who you want to be. Then do what that person would do.", who: "Epictetus", work: "Discourses" },
  { school: "stoicism", text: "Begin at once to live, and count each day as a whole life.", who: "Seneca", work: "Letters to Lucilius" },
  { school: "stoicism", text: "Difficulties show what a person is made of.", who: "Epictetus", work: "Discourses" },
  // Taoism
  { school: "taoism", text: "A journey of a thousand miles begins under your feet.", who: "Lao Tzu", work: "Tao Te Ching" },
  { school: "taoism", text: "Water is soft and yielding, yet nothing wears down the hard and strong better.", who: "Lao Tzu", work: "Tao Te Ching" },
  { school: "taoism", text: "Knowing others is cleverness. Knowing yourself is wisdom.", who: "Lao Tzu", work: "Tao Te Ching" },
  { school: "taoism", text: "Mastering others takes force. Mastering yourself takes strength.", who: "Lao Tzu", work: "Tao Te Ching" },
  { school: "taoism", text: "Do the difficult while it is still easy. Do the great while it is still small.", who: "Lao Tzu", work: "Tao Te Ching" },
  { school: "taoism", text: "The cook who follows the grain never dulls his knife.", who: "Zhuangzi", work: "Zhuangzi" },
  { school: "taoism", text: "The highest good is like water: it helps everything and does not compete.", who: "Lao Tzu", work: "Tao Te Ching" },
  { school: "taoism", text: "Was I a man dreaming of a butterfly, or a butterfly dreaming of a man?", who: "Zhuangzi", work: "Zhuangzi" },
  // Absurdism and existentialism (older voices on the same questions)
  { school: "absurdism", text: "Become who you are.", who: "Pindar", work: "Pythian Odes" },
  { school: "absurdism", text: "He who has a why to live can bear almost any how.", who: "Nietzsche", work: "Twilight of the Idols" },
  { school: "absurdism", text: "Life can only be understood backwards, but it must be lived forwards.", who: "Kierkegaard", work: "Journals" },
  { school: "absurdism", text: "Anxiety is the dizziness of freedom.", who: "Kierkegaard", work: "The Concept of Anxiety" },
  { school: "absurdism", text: "You must have chaos in you to give birth to a dancing star.", who: "Nietzsche", work: "Thus Spoke Zarathustra" },
  { school: "absurdism", text: "No one steps into the same river twice: the river has changed, and so have you.", who: "Heraclitus", work: "Fragments" },
  { school: "absurdism", text: "Love your fate, the hard parts too. Want nothing to be different.", who: "Nietzsche", work: "Ecce Homo" },
  // Buddhism and Zen
  { school: "buddhism", text: "Your mind shapes what you become. Guard it.", who: "The Buddha", work: "Dhammapada" },
  { school: "buddhism", text: "Better than a thousand empty words is one word that brings peace.", who: "The Buddha", work: "Dhammapada" },
  { school: "buddhism", text: "Drop by drop, a water pot is filled. So is a person, by small good deeds.", who: "The Buddha", work: "Dhammapada" },
  { school: "buddhism", text: "Conquering yourself is a greater victory than conquering a thousand battles.", who: "The Buddha", work: "Dhammapada" },
  { school: "buddhism", text: "Hatred never ends through hatred, only through its absence. That is an old law.", who: "The Buddha", work: "Dhammapada" },
  { school: "buddhism", text: "Before enlightenment, chop wood, carry water. After enlightenment, chop wood, carry water.", who: "Zen saying", work: "Chan tradition" },
  { school: "buddhism", text: "Not knowing is the most intimate.", who: "Dizang", work: "Book of Serenity" },
  { school: "buddhism", text: "When you sit, sit. When you walk, walk. Above all, don't wobble.", who: "Yunmen", work: "Zen tradition" },
];

export const SCHOOL_NAMES = { stoicism: "Stoicism", taoism: "Taoism", absurdism: "Existentialism", buddhism: "Buddhism and Zen" };

function hash(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

// The quote for a day (the same all day). shift moves to the next one ("another").
// schools: the player's favourite schools, if chosen (from the questionnaire later).
export function quoteOfDay(dateKey = todayKey(), shift = 0, schools = null) {
  const pool = schools?.length ? QUOTES.filter((q) => schools.includes(q.school)) : QUOTES;
  const list = pool.length ? pool : QUOTES;
  return list[(hash(dateKey) + shift) % list.length];
}
