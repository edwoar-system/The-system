// The Learn tab's own content: language starters. Everything else (quotes, philosophy, skills,
// System words) comes from the rest of the game, and anything missing comes from Wikipedia.

// Basic hiragana with their sounds, in table order. Katakana is the same table shifted in Unicode.
const HIRA = "あa いi うu えe おo かka きki くku けke こko さsa しshi すsu せse そso たta ちchi つtsu てte とto なna にni ぬnu ねne のno はha ひhi ふfu へhe ほho まma みmi むmu めme もmo やya _ ゆyu _ よyo らra りri るru れre ろro わwa _ _ _ をwo んn";
// "_" keeps the table's gaps (no yi, ye, wi, wu, we), so every row lines up with its vowels.
export const HIRAGANA = HIRA.split(" ").map((x) => (x === "_" ? ["", ""] : [x[0], x.slice(1)]));
export const KATAKANA = HIRAGANA.map(([k, r]) => [k ? String.fromCharCode(k.charCodeAt(0) + 0x60) : "", r]);

export const LANGUAGES = [
  {
    id: "japanese",
    name: "Japanese",
    skill: "japanese",
    wiki: "Japanese language",
    intro: "Three scripts: hiragana for grammar and native words, katakana for foreign words, kanji for meaning. Start with hiragana; you can read it in about two weeks with 10 minutes a day.",
    steps: [
      "Learn hiragana: 5 new characters a day, and say them out loud.",
      "Then katakana, the same way. It's the same sounds in a sharper shape.",
      "Learn the phrases below until you can say them without looking.",
      "Start kanji with the most common ones (one, two, person, day, big).",
      "Read and listen a little every day: a 10-minute block beats a 2-hour Sunday.",
    ],
    phrases: [
      ["おはようございます", "ohayō gozaimasu", "Good morning"],
      ["こんにちは", "konnichiwa", "Hello"],
      ["こんばんは", "konbanwa", "Good evening"],
      ["はじめまして", "hajimemashite", "Nice to meet you"],
      ["よろしくおねがいします", "yoroshiku onegaishimasu", "Please treat me well (after introducing yourself)"],
      ["ありがとう", "arigatō", "Thanks"],
      ["すみません", "sumimasen", "Excuse me / sorry"],
      ["はい / いいえ", "hai / iie", "Yes / no"],
      ["わかりません", "wakarimasen", "I don't understand"],
      ["いただきます", "itadakimasu", "Said before eating"],
      ["ごちそうさまでした", "gochisōsama deshita", "Said after eating"],
      ["おやすみなさい", "oyasuminasai", "Good night"],
    ],
    kana: true,
  },
  {
    id: "latin",
    name: "Latin",
    skill: "latin",
    wiki: "Latin",
    intro: "Latin shows who does what with word endings, not word order. Learn the endings and sentences open up.",
    steps: [
      "Pronounce it the classical way: c is always k, v sounds like w.",
      "Learn the verb 'to be' and the first declension below by heart.",
      "Learn 10 words a day, always with their gender and genitive.",
      "Translate one short sentence a day; find the verb first, then the subject.",
      "Read real Latin early: mottos and short quotes are a good start.",
    ],
    tables: [
      { title: "esse, to be (present)", rows: [["sum", "I am"], ["es", "you are"], ["est", "he, she, it is"], ["sumus", "we are"], ["estis", "you (all) are"], ["sunt", "they are"]] },
      { title: "First declension: rosa, rose", rows: [["rosa / rosae", "nominative (subject)"], ["rosae / rosārum", "genitive (of)"], ["rosae / rosīs", "dative (to, for)"], ["rosam / rosās", "accusative (object)"], ["rosā / rosīs", "ablative (by, with, from)"]] },
    ],
    phrases: [
      ["Carpe diem", "", "Seize the day"],
      ["Memento mori", "", "Remember that you will die"],
      ["Amor fati", "", "Love of fate"],
      ["Festina lente", "", "Make haste slowly"],
      ["Per aspera ad astra", "", "Through hardships to the stars"],
      ["Mens sana in corpore sano", "", "A healthy mind in a healthy body"],
    ],
  },
  {
    id: "any",
    name: "Any other language",
    skill: null,
    wiki: "Language acquisition",
    intro: "The same method works for every language: the most common words first, a lot of listening, and speaking before you feel ready.",
    steps: [
      "Learn the 100 most common words first; they cover about half of everyday speech.",
      "Use spaced repetition (a flashcard app that repeats what you forget).",
      "Listen every day: podcasts, shows with subtitles in the language.",
      "Speak from week one, even badly. Talk to yourself if nobody else is there.",
      "Make it a daily quest: 10 minutes every day beats one long session.",
    ],
    phrases: [],
  },
];
export const languageById = Object.fromEntries(LANGUAGES.map((l) => [l.id, l]));
