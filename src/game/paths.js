// Paths: short reading routes for shaping your life, one page a day (Learn tab).
// Each page: the idea in a few paragraphs (**bold** marks a key word), one quote from a public-domain translation,
// and one question to sit with. The Codex text comes from Edward's Codex doc; Kaizen is written for the app.

export const PATH_PAGE_XP = 15;

export const PATHS = [
  {
    id: "codex",
    name: "The Codex",
    sub: "Six ideas for building a life on purpose: two from philosophy, four about the habits that shape you every day.",
    skill: "philosophy",
    pages: [
      {
        id: "gap", title: "Epictetus: The Gap",
        body: [
          "Things will happen to you that you can't control. Someone cuts you off, a friend cancels, a message goes unanswered. The first jolt of anger or fear is called an **impression**. It arrives on its own, and feeling it doesn't make you weak.",
          "Suffering starts one step later, when you **agree** with the impression: \"This is a disaster. Everything depends on this.\" Epictetus called that agreement assent. Between the impression and the assent there is a small gap, and that gap has always been yours.",
          "So catch the impression in the gap and put it on trial. Is this actually true? Is it actually bad? Or is it just something outside my control that I decided to call bad?",
        ],
        quote: { text: "Men are disturbed not by the things which happen, but by the opinions about the things.", who: "Epictetus, Enchiridion 5 (trans. George Long)" },
        question: "What upset you recently, and what did you agree it meant?",
      },
      {
        id: "lastman", title: "Nietzsche: The Last Man",
        body: [
          "Nietzsche warned about a type of person he called the **last man**. He wants only comfort: a small pleasure by day, another by night. He takes no risks and avoids anything that might hurt.",
          "The danger is that he isn't miserable. An unhappy person knows something is wrong and goes looking for a way out. The last man feels fine, so he never changes. He mistakes numbness for happiness.",
          "Nietzsche's answer is to **overcome who you were yesterday**. Your days are shaping you into someone either way. The only question is which person you're becoming.",
        ],
        quote: { text: "Man is something that is to be surpassed. What have ye done to surpass man?", who: "Nietzsche, Thus Spoke Zarathustra, Prologue 3 (trans. Thomas Common)" },
        question: "What did you choose today because it was comfortable, not because it made you better?",
      },
      {
        id: "room", title: "Environment: Rig the Room",
        body: [
          "Your surroundings shape who you become, whether you plan them or not, so you might as well plan them. Discipline runs out, but a well-designed room keeps working.",
          "Start by finding the **friction**: what you keep skipping, and what you keep falling into. Then put good habits in your path, like the book on your pillow or the journal on your keyboard. Put bad habits out of reach, like the charger outside the bedroom.",
          "Your environment is bigger than your room. What you watch and read counts too, so mute what doesn't fit who you want to be. And choose the rooms you enter. Spend time around people who already live the way you want to, until their standard becomes your normal.",
        ],
        quote: { text: "Associate with those who will make a better man of you.", who: "Seneca, Moral Letters 7 (trans. Richard Gummere)" },
        question: "What in your room makes your worst habit easy?",
      },
      {
        id: "lockin", title: "Locking In: One Thing, One Window",
        body: [
          "Focus is something you set up, not something you wait for. The quality of your work sessions decides a large part of your future, so treat the start of each one as a ritual.",
          "Clear everything visible from your desk. Write down the **one** thing this session is for, on paper. Give it a time limit, because work expands to fill the time you give it (Parkinson's Law). Close every tab you don't need. Put the phone on Do Not Disturb and take it out of the room. However disciplined you are, it goes.",
          "Block the noise with headphones, music without words, or white noise. Then start.",
        ],
        quote: { text: "Every moment think steadily … to do what thou hast in hand … and to give thyself relief from all other thoughts.", who: "Marcus Aurelius, Meditations II.5 (trans. George Long)" },
        question: "What is the one thing this session is for?",
      },
      {
        id: "phone", title: "The Phone: Catch the Reach",
        body: [
          "The phone is a symptom. Most of the time you reach for it because you're bored, anxious, or avoiding something. So the moment your hand moves, stop and name what you're actually feeling.",
          "You can't win by willpower alone, because the feed is built to keep you there. You win through **design**. Find the places where you scroll most and break them: charger outside the bedroom, phone out of reach at your desk, locked away at the gym. Make it boring with fewer apps, grayscale, and Do Not Disturb.",
          "A habit can't really be deleted, only replaced. Put a notebook where the phone used to lie. And when you slip, ask: is this improving my life right now? If not, put it down.",
        ],
        quote: { text: "All the unhappiness of men arises from one single fact, that they cannot stay quietly in their own chamber.", who: "Blaise Pascal, Pensées 139 (trans. W. F. Trotter)" },
        question: "What were you feeling the last time you reached for your phone?",
      },
      {
        id: "journal", title: "Journaling: Know Yourself",
        body: [
          "How well you understand yourself shapes every decision you'll ever make. A journal is the simplest tool for that.",
          "Make it easy to start. Get a journal you actually like and leave it where you can't miss it. Set a timer for five minutes and answer one prompt: **What's on my mind right now?** Write whatever comes, without caring about grammar or neatness. At the start, the only goal is to not miss a day.",
          "Then question what you wrote, the way Socrates questioned everything. What's the real issue underneath? Is it true? What would I tell a friend? Keep asking, and you'll find things in your own head you didn't know were there.",
        ],
        quote: { text: "The unexamined life is not worth living.", who: "Socrates, in Plato's Apology 38a (trans. Benjamin Jowett)" },
        question: "What's on your mind right now, and is it true?",
      },
    ],
  },
  {
    id: "kaizen",
    name: "Kaizen: 1% a day",
    sub: "The Japanese idea of continuous improvement: change through steps so small they can't fail.",
    skill: "philosophy",
    pages: [
      {
        id: "onepercent", title: "One Percent",
        body: [
          "Kaizen means \"change for the better\". After the war, Japanese factories used it to improve a little every day instead of waiting for one big breakthrough, and the little steps added up faster than anyone expected.",
          "The maths is simple. Get **1% better** every day for a year and you end up about 37 times better. Get 1% worse every day and you end up close to zero. One day barely shows either way, which is exactly why most people give up: they judge the day instead of the direction.",
          "So stop asking whether today was impressive. Ask whether today pointed the right way.",
        ],
        quote: { text: "If you add only a little to a little and do this often, soon that little will become great.", who: "Hesiod, Works and Days 361 (trans. Hugh G. Evelyn-White)" },
        question: "What would 1% better look like for you today?",
      },
      {
        id: "toosmall", title: "Steps Too Small to Fail",
        body: [
          "When a change scares your brain, it pushes back: you put it off, you get tired, you find a reason. Willpower loses that fight most days.",
          "Kaizen goes around the fight. Make the step **so small it feels silly**: one push-up, one page, one minute of meditation, putting your running shoes by the door. Too small to be scary, so you actually do it.",
          "Still not doing it? The step is too big. Make it smaller. Once it's automatic, add a little. You're not training the push-up yet; you're training the showing up.",
        ],
        quote: { text: "All difficult things in the world are sure to arise from a previous state in which they were easy, and all great things from one in which they were small.", who: "Lao Tzu, Tao Te Ching 63 (trans. James Legge)" },
        question: "What's a step so small you'd feel silly skipping it?",
      },
      {
        id: "questions", title: "Ask Small Questions",
        body: [
          "Big questions freeze you. \"How do I fix my whole life?\" has no first step, so your brain gives up and opens an app.",
          "Small questions get answers. **\"What's one small thing I could do today to sleep better?\"** Ask it every day and your brain starts collecting answers on its own: in the shower, on the way to school, while you're doing something else.",
          "Pick one area you want to change and give it one small question. Ask it every morning for a week.",
        ],
        quote: { text: "No great thing is created suddenly, any more than a bunch of grapes or a fig.", who: "Epictetus, Discourses I.15 (trans. George Long)" },
        question: "What's one small thing you could do today to get closer to what you want?",
      },
      {
        id: "smallproblems", title: "Fix Small Problems Early",
        body: [
          "Big failures almost never start big. A habit dies after one skipped day turns into two, two into a week, a week into \"I'm not someone who does that\".",
          "Kaizen watches for the **small slip** and fixes it while it's still small. Missed a day? Fine, it happens. Just don't miss twice. Room getting messy? Put back one thing now, not twenty things on Sunday.",
          "Small problems are cheap to fix. Big ones are expensive. The trick is noticing them while they're still cheap.",
        ],
        quote: { text: "The tree which fills the arms grew from the tiniest sprout; the tower of nine storeys rose from a (small) heap of earth.", who: "Lao Tzu, Tao Te Ching 64 (trans. James Legge)" },
        question: "What small slip is starting right now that you could fix today?",
      },
      {
        id: "repeat", title: "You Are What You Repeat",
        body: [
          "You don't become a reader by deciding to be one. You become one by reading, again and again, until it's simply what you do. Every time you act, you cast a **vote** for the person you're becoming.",
          "That's why small actions matter more than they look. Ten minutes of study doesn't change your grade today, but it tells you who you are: someone who studies. Identity follows evidence.",
          "And give yourself a small reward right after: a tick, a fist pump, the quest-clear window. Feeling good right after is what makes your brain want to do it again.",
        ],
        quote: { text: "We become just by doing just acts, temperate by doing temperate acts, brave by doing brave acts.", who: "Aristotle, Nicomachean Ethics II.1 (trans. W. D. Ross)" },
        question: "Who did today's actions vote for?",
      },
      {
        id: "today", title: "Only Today",
        body: [
          "You can't do a year. You can't even do a week. All you can ever do is **today**, so that's the only unit that matters.",
          "Plans for next month are easy and cost nothing. The thing that changes your life is the small action you take before tonight. Do today's step, tick it, and let tomorrow handle tomorrow.",
          "When it all feels like too much, shrink it to the next ten minutes. You can always do ten minutes.",
        ],
        quote: { text: "Hold every hour in your grasp. Lay hold of to-day's task, and you will not need to depend so much upon to-morrow's.", who: "Seneca, Moral Letters 1 (trans. Richard Gummere)" },
        question: "What is today's one step?",
      },
    ],
  },
];
export const pathById = Object.fromEntries(PATHS.map((p) => [p.id, p]));

// Pages read in a path, and the next one to read (null when you've read them all).
export const readIn = (player, pathId) => player?.paths?.[pathId]?.read ?? {};
export function nextPage(player, pathId) {
  const p = pathById[pathId];
  const read = readIn(player, pathId);
  return p?.pages.find((pg) => !read[pg.id]) ?? null;
}

// "**word**" → [{ text, bold }] for the reader.
export const parts = (paragraph) => paragraph.split(/(\*\*[^*]+\*\*)/g).filter(Boolean).map((x) => (x.startsWith("**") ? { text: x.slice(2, -2), bold: true } : { text: x, bold: false }));
