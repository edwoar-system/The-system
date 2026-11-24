// System messages: one line of old wisdom a day. Browse them all in the quote library.
// Written as short paraphrases in our own words (the sources are ancient texts), with the author and work.
import { todayKey } from "./quests";

export const QUOTES = [
  // Stoicism
  { id: "control", school: "stoicism", text: "You control your choices, not what happens to you. Spend your strength there.", who: "Epictetus", work: "Enchiridion" },
  { id: "wake", school: "stoicism", text: "When you wake up and don't want to rise, remember you were made to do the work of a human being.", who: "Marcus Aurelius", work: "Meditations" },
  { id: "obstacle", school: "stoicism", text: "The obstacle in your path becomes the path.", who: "Marcus Aurelius", work: "Meditations" },
  { id: "imagination", school: "stoicism", text: "We suffer more in our imagination than in reality.", who: "Seneca", work: "Letters to Lucilius" },
  { id: "wasted", school: "stoicism", text: "Life is long enough if you know how to use it. It is wasted, not short.", who: "Seneca", work: "On the Shortness of Life" },
  { id: "beone", school: "stoicism", text: "Stop talking about what a good person is. Be one.", who: "Marcus Aurelius", work: "Meditations" },
  { id: "free", school: "stoicism", text: "No one is free who is a slave to their own wants.", who: "Seneca", work: "Letters to Lucilius" },
  { id: "decide", school: "stoicism", text: "First decide who you want to be. Then do what that person would do.", who: "Epictetus", work: "Discourses" },
  { id: "begin", school: "stoicism", text: "Begin at once to live, and count each day as a whole life.", who: "Seneca", work: "Letters to Lucilius" },
  { id: "difficulties", school: "stoicism", text: "Difficulties show what a person is made of.", who: "Epictetus", work: "Discourses" },
  // Taoism
  { id: "journey", school: "taoism", text: "A journey of a thousand miles begins under your feet.", who: "Lao Tzu", work: "Tao Te Ching" },
  { id: "water", school: "taoism", text: "Water is soft and yielding, yet nothing wears down the hard and strong better.", who: "Lao Tzu", work: "Tao Te Ching" },
  { id: "knowself", school: "taoism", text: "Knowing others is cleverness. Knowing yourself is wisdom.", who: "Lao Tzu", work: "Tao Te Ching" },
  { id: "masterself", school: "taoism", text: "Mastering others takes force. Mastering yourself takes strength.", who: "Lao Tzu", work: "Tao Te Ching" },
  { id: "small", school: "taoism", text: "Do the difficult while it is still easy. Do the great while it is still small.", who: "Lao Tzu", work: "Tao Te Ching" },
  { id: "cook", school: "taoism", text: "The cook who follows the grain never dulls his knife.", who: "Zhuangzi", work: "Zhuangzi" },
  { id: "highestgood", school: "taoism", text: "The highest good is like water: it helps everything and does not compete.", who: "Lao Tzu", work: "Tao Te Ching" },
  { id: "butterfly", school: "taoism", text: "Was I a man dreaming of a butterfly, or a butterfly dreaming of a man?", who: "Zhuangzi", work: "Zhuangzi" },
  // Absurdism and existentialism (older voices on the same questions)
  { id: "become", school: "absurdism", text: "Become who you are.", who: "Pindar", work: "Pythian Odes" },
  { id: "why", school: "absurdism", text: "He who has a why to live can bear almost any how.", who: "Nietzsche", work: "Twilight of the Idols" },
  { id: "backwards", school: "absurdism", text: "Life can only be understood backwards, but it must be lived forwards.", who: "Kierkegaard", work: "Journals" },
  { id: "anxiety", school: "absurdism", text: "Anxiety is the dizziness of freedom.", who: "Kierkegaard", work: "The Concept of Anxiety" },
  { id: "chaos", school: "absurdism", text: "You must have chaos in you to give birth to a dancing star.", who: "Nietzsche", work: "Thus Spoke Zarathustra" },
  { id: "amorfati", school: "absurdism", text: "Love your fate, the hard parts too. Want nothing to be different.", who: "Nietzsche", work: "Ecce Homo" },
  // Buddhism and Zen
  { id: "mind", school: "buddhism", text: "Your mind shapes what you become. Guard it.", who: "The Buddha", work: "Dhammapada" },
  { id: "oneword", school: "buddhism", text: "Better than a thousand empty words is one word that brings peace.", who: "The Buddha", work: "Dhammapada" },
  { id: "drop", school: "buddhism", text: "Drop by drop, a water pot is filled. So is a person, by small good deeds.", who: "The Buddha", work: "Dhammapada" },
  { id: "conquer", school: "buddhism", text: "Conquering yourself is a greater victory than conquering a thousand battles.", who: "The Buddha", work: "Dhammapada" },
  { id: "hatred", school: "buddhism", text: "Hatred never ends through hatred, only through its absence. That is an old law.", who: "The Buddha", work: "Dhammapada" },
  { id: "woodwater", school: "buddhism", text: "Before enlightenment, chop wood, carry water. After enlightenment, chop wood, carry water.", who: "Zen saying", work: "Chan tradition" },
  { id: "notknowing", school: "buddhism", text: "Not knowing is the most intimate.", who: "Dizang", work: "Book of Serenity" },
  { id: "wobble", school: "buddhism", text: "When you sit, sit. When you walk, walk. Above all, don't wobble.", who: "Yunmen", work: "Zen tradition" },
  // Greek philosophy
  { id: "river", school: "greek", text: "You never step into the same river twice.", who: "Heraclitus", work: "Fragments" },
  { id: "character", school: "greek", text: "Character is fate.", who: "Heraclitus", work: "Fragments" },
  { id: "brave", school: "greek", text: "We become brave by doing brave things, and fair by doing fair things.", who: "Aristotle", work: "Nicomachean Ethics" },
  { id: "swallow", school: "greek", text: "One swallow doesn't make a spring, and one good day doesn't make a good life.", who: "Aristotle", work: "Nicomachean Ethics" },
  { id: "examine", school: "greek", text: "A life without examining it is not worth living.", who: "Socrates", work: "Plato, Apology" },
  // The warrior's way
  { id: "yesterday", school: "warrior", text: "Today, beat the person you were yesterday.", who: "Miyamoto Musashi", work: "The Book of Five Rings" },
  { id: "nouse", school: "warrior", text: "Do nothing that is of no use.", who: "Miyamoto Musashi", work: "The Book of Five Rings" },
  { id: "see", school: "warrior", text: "Learn to see what the eye can't see.", who: "Miyamoto Musashi", work: "The Book of Five Rings" },
  { id: "knowenemy", school: "warrior", text: "Know the enemy and know yourself, and a hundred battles hold no danger.", who: "Sun Tzu", work: "The Art of War" },
  { id: "wonbefore", school: "warrior", text: "The one who wins has already won before the fight begins.", who: "Sun Tzu", work: "The Art of War" },
  { id: "seven", school: "warrior", text: "Fall seven times, stand up eight.", who: "Japanese proverb", work: "Japanese proverb" },
  // Confucianism
  { id: "knowledge", school: "confucian", text: "Knowing what you know, and knowing what you don't: that is knowledge.", who: "Confucius", work: "Analects" },
  { id: "better", school: "confucian", text: "When you meet someone better than you, think about becoming like them.", who: "Confucius", work: "Analects" },
  { id: "childheart", school: "confucian", text: "A great person never loses the heart they had as a child.", who: "Mencius", work: "Mencius" },
];

export const SCHOOL_NAMES = {
  stoicism: "Stoicism", taoism: "Taoism", absurdism: "Existentialism", buddhism: "Buddhism and Zen",
  greek: "Greek philosophy", warrior: "The warrior's way", confucian: "Confucianism",
};

function hash(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

// The quote for a day (the same all day). shift moves to the next one ("another").
// schools: the player's favourite schools, if chosen in Tune the System.
export const quoteById = Object.fromEntries(QUOTES.map((q) => [q.id, q]));

// favs: your starred quotes. They come back three times as often, even outside your schools.
export function quoteOfDay(dateKey = todayKey(), shift = 0, schools = null, favs = null) {
  const pool = schools?.length ? QUOTES.filter((q) => schools.includes(q.school)) : QUOTES;
  const base = pool.length ? pool : QUOTES;
  const starred = (favs ?? []).map((id) => quoteById[id]).filter(Boolean);
  const list = [...base, ...starred, ...starred, ...starred];
  return list[(hash(dateKey) + shift) % list.length];
}
