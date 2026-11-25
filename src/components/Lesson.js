// One set of a course, step by step:
//   1. Learn: each card, with its sound.
//   2. Write (signs only): trace it, then write it from memory and compare.
//   3. Quiz: both ways (sign → meaning, meaning → sign); a wrong card comes back until every card is right.
//   4. Test: every card once, mixed. No mistakes = the set is passed and the next one opens; a mistake = back to the quiz.
// A review session (review=true) is one round of quiz questions over the cards that are due.
import { useMemo, useRef, useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { optionsFor } from "../game/courses";
import { passSet, saveReview } from "../lib/courses";
import { canSpeak, say } from "../lib/speech";
import { doneFeel, tapFeel } from "../lib/haptics";
import { showSystem } from "../lib/popup";
import WritePad from "./WritePad";
import { Frame, Label, SysButton } from "./sys";
import { useTheme } from "../theme";
import { t } from "../i18n";

const fill = (s, vars) => Object.entries(vars).reduce((acc, [k, v]) => acc.split(`{${k}}`).join(String(v)), s);
const shuffle = (a) => { const b = [...a]; for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } return b; };
// A quiz question: dir "fb" shows the sign/word and asks its meaning; "bf" the other way.
const questions = (items) => shuffle(items.flatMap((it) => [{ it, dir: "fb" }, { it, dir: "bf" }]));

function Big({ item, onSay, course }) {
  const { color, font } = useTheme();
  return (
    <View style={{ alignItems: "center", gap: 6 }}>
      <Text style={{ fontSize: item.front.length > 3 ? 44 : 84, lineHeight: item.front.length > 3 ? 54 : 100, color: "#FFFFFF", textAlign: "center" }}>{item.front}</Text>
      {item.reading ? <Text style={{ fontFamily: font.bodyMedium, fontSize: 16, color: color.accent }}>{item.reading}</Text> : null}
      {onSay && canSpeak() ? (
        <Pressable accessibilityRole="button" accessibilityLabel={t.course.listen} onPress={() => say(item.say ?? item.front, course.speech)} hitSlop={8}
          style={({ pressed }) => ({ minHeight: 36, paddingHorizontal: 12, justifyContent: "center", borderWidth: 1, borderColor: "rgba(159,203,255,0.3)", backgroundColor: pressed ? "rgba(159,203,255,0.15)" : "transparent" })}>
          <Text style={{ fontFamily: font.bodyBold, fontSize: 12, color: color.text }}>{t.course.listen}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export default function Lesson({ user, course, set, review = null, onClose }) {
  const { color, font } = useTheme();
  const insets = useSafeAreaInsets();
  const started = useRef(Date.now());
  const items = review ?? set.items;
  // Wrong answers come from the same part of the course (kana with kana, words with words), and from
  // sets you have already met where possible, so a choice is never easy because it looks out of place.
  const poolFor = useMemo(() => {
    const upTo = set ? course.sets.indexOf(set) : course.sets.length - 1;
    const pools = {};
    const stageOf = {};
    course.stages.forEach((st) => {
      const same = course.sets.filter((s) => s.stage === st);
      const met = same.filter((s) => course.sets.indexOf(s) <= upTo).flatMap((s) => s.items);
      pools[st] = met.length >= 8 ? met : same.flatMap((s) => s.items);
      same.forEach((s) => s.items.forEach((it) => { stageOf[it.id] = st; }));
    });
    return (it) => pools[stageOf[it.id]] ?? [];
  }, [course, set]);
  const writes = !review && items.some((it) => it.write);

  const [phase, setPhase] = useState(review ? "quiz" : "learn"); // learn | write | quiz | test | done | failed
  const [i, setI] = useState(0);
  const [writeStep, setWriteStep] = useState("trace"); // trace | memory | check
  const [writeQueue, setWriteQueue] = useState(() => items.filter((it) => it.write));
  const [padKey, setPadKey] = useState(0);
  const [queue, setQueue] = useState(() => (review ? shuffle(items).map((it) => ({ it, dir: Math.random() < 0.5 ? "fb" : "bf" })) : questions(items)));
  const [picked, setPicked] = useState(null);
  const [mistakes, setMistakes] = useState(0);
  const [results, setResults] = useState({}); // review: id -> right
  const [busy, setBusy] = useState(false);
  const [reward, setReward] = useState(null);

  const q = queue[0];
  const opts = useMemo(() => (q ? optionsFor(q.it, poolFor(q.it), q.dir === "fb" ? "back" : "front") : []), [q, poolFor]);
  const minutes = () => Math.max(2, Math.round((Date.now() - started.current) / 60000));

  function startTest() {
    setQueue(shuffle(items).map((it) => ({ it, dir: Math.random() < 0.5 ? "fb" : "bf" })));
    setMistakes(0);
    setPhase("test");
  }

  async function finish(passed, res) {
    setBusy(true);
    try {
      if (review) {
        const r = await saveReview(user.uid, course, res, minutes());
        setReward({ xp: r?.xp ?? 0 });
        setPhase("done");
      } else if (passed) {
        const r = await passSet(user.uid, course, set, minutes());
        doneFeel();
        setReward({ xp: r.xp, quest: r.quest });
        showSystem({ title: t.course.passedTitle, lines: [fill(t.course.passedLine, { n: items.length }), t.course.reviewLine], tone: "buff" });
        setPhase("done");
      }
    } catch {
      setReward({ error: true, retry: () => finish(passed, res) });
      setPhase("done");
    } finally {
      setBusy(false);
    }
  }

  function answer(opt) {
    if (picked != null) return;
    const right = opt === (q.dir === "fb" ? q.it.back : q.it.front);
    setPicked(opt);
    if (right) tapFeel();
    if (phase === "quiz" && !review && !right) setMistakes((m) => m + 1);
    if (phase === "test" && !right) setMistakes((m) => m + 1);
    if (review) setResults((r) => ({ ...r, [q.it.id]: r[q.it.id] === false ? false : right }));
    setTimeout(() => {
      setPicked(null);
      const rest = queue.slice(1);
      if (phase === "quiz" && !review) {
        // A wrong card comes back a few questions later.
        const next = right ? rest : [...rest.slice(0, 3), q, ...rest.slice(3)];
        if (!next.length) startTest(); else setQueue(next);
      } else if (phase === "test") {
        if (!right) { setPhase("failed"); return; }
        if (!rest.length) finish(true); else setQueue(rest);
      } else {
        // review: one pass
        if (!rest.length) finish(true, { ...results, [q.it.id]: results[q.it.id] === false ? false : right }); else setQueue(rest);
      }
    }, right ? 450 : 1300);
  }

  const total = phase === "learn" ? items.length : phase === "write" ? writeQueue.length : null;
  const head = review ? t.course.review : fill(t.course.setTitle, { n: course.sets.indexOf(set) + 1, of: course.sets.length });

  return (
    <Modal animationType="slide" visible onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: color.bg }}>
        <ScrollView keyboardShouldPersistTaps="handled" scrollEnabled={phase !== "write"}
          contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 40, paddingHorizontal: 16, maxWidth: 520, width: "100%", alignSelf: "center", gap: 14 }}>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
            <Pressable accessibilityRole="button" onPress={onClose} style={{ minHeight: 44, justifyContent: "center" }}>
              <Text style={{ fontFamily: font.bodyBold, fontSize: 14, color: color.accent }}>{`‹ ${course.name}`}</Text>
            </Pressable>
            <Text style={{ fontFamily: font.bold, fontSize: 11, letterSpacing: 2, color: color.hi }}>{head}</Text>
          </View>

          {/* Steps */}
          {!review ? (
            <View style={{ flexDirection: "row", gap: 4 }}>
              {["learn", ...(writes ? ["write"] : []), "quiz", "test"].map((p) => {
                const order = ["learn", "write", "quiz", "test", "failed", "done"];
                const on = p === phase || (p === "quiz" && phase === "failed");
                const past = order.indexOf(p) < order.indexOf(phase === "failed" ? "test" : phase);
                return (
                  <View key={p} style={{ flex: 1, gap: 4 }}>
                    <View style={{ height: 4, backgroundColor: on || past ? color.purple : "rgba(159,203,255,0.15)" }} />
                    <Text style={{ fontFamily: font.bodyBold, fontSize: 10, color: on ? "#FFFFFF" : color.muted, textAlign: "center" }}>{t.course.steps[p]}</Text>
                  </View>
                );
              })}
            </View>
          ) : null}

          {phase === "learn" ? (
            <Frame cut={14} contentStyle={{ padding: 18, gap: 16 }}>
              <Text style={{ fontFamily: font.body, fontSize: 12, color: color.muted, textAlign: "center" }}>{fill(t.course.cardOf, { n: i + 1, of: total })}</Text>
              <Big item={items[i]} onSay course={course} />
              <Text style={{ fontFamily: font.bold, fontSize: 20, color: color.text, textAlign: "center" }}>{items[i].back}</Text>
              <SysButton label={i + 1 < items.length ? t.course.next : writes ? t.course.toWrite : t.course.toQuiz} onPress={() => {
                if (i + 1 < items.length) { setI(i + 1); say(items[i + 1].say ?? items[i + 1].front, course.speech); return; }
                setI(0);
                setPhase(writes ? "write" : "quiz");
              }} />
            </Frame>
          ) : null}

          {phase === "write" && writeQueue.length ? (
            <View style={{ gap: 12 }}>
              <Text style={{ fontFamily: font.body, fontSize: 13, lineHeight: 18, color: color.muted, textAlign: "center" }}>
                {writeStep === "trace" ? t.course.traceHint : writeStep === "memory" ? fill(t.course.memoryHint, { back: writeQueue[0].back }) : t.course.checkHint}
              </Text>
              <Text style={{ fontFamily: font.bold, fontSize: 18, color: color.text, textAlign: "center" }}>{writeStep === "trace" ? `${writeQueue[0].front}  ·  ${writeQueue[0].back}` : writeQueue[0].back}</Text>
              <WritePad key={`${writeQueue[0].id}-${writeStep === "check" ? "memory" : writeStep}-${padKey}`} glyph={writeQueue[0].front}
                mode={writeStep === "trace" ? "trace" : "memory"} reveal={writeStep === "check"} />
              {writeStep !== "check" ? <View style={{ flexDirection: "row", gap: 8 }}>
                <SysButton label={t.course.clear} onPress={() => setPadKey((k) => k + 1)} style={{ flex: 1 }} />
                {writeStep === "trace" ? <SysButton label={t.course.fromMemory} onPress={() => { setWriteStep("memory"); setPadKey((k) => k + 1); }} style={{ flex: 1 }} /> : null}
                {writeStep === "memory" ? <SysButton label={t.course.check} onPress={() => setWriteStep("check")} style={{ flex: 1 }} /> : null}
              </View> : null}
              {writeStep === "check" ? (
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <SysButton label={t.course.wrong} onPress={() => {
                    // Not right yet: this sign comes back at the end.
                    setWriteQueue((wq) => [...wq.slice(1), wq[0]]);
                    setWriteStep("trace");
                    setPadKey((k) => k + 1);
                  }} style={{ flex: 1 }} />
                  <SysButton label={t.course.right} onPress={() => {
                    tapFeel();
                    const rest = writeQueue.slice(1);
                    setWriteStep("trace");
                    setPadKey((k) => k + 1);
                    if (rest.length) setWriteQueue(rest); else setPhase("quiz");
                  }} style={{ flex: 1 }} />
                </View>
              ) : null}
              <Text style={{ fontFamily: font.body, fontSize: 12, color: color.muted, textAlign: "center" }}>{fill(t.course.writeLeft, { n: writeQueue.length })}</Text>
            </View>
          ) : null}

          {(phase === "quiz" || phase === "test") && q ? (
            <Frame cut={14} contentStyle={{ padding: 18, gap: 14 }}>
              <Text style={{ fontFamily: font.body, fontSize: 12, color: color.muted, textAlign: "center" }}>
                {phase === "test" ? fill(t.course.testLeft, { n: queue.length }) : review ? fill(t.course.reviewLeft, { n: queue.length }) : fill(t.course.quizLeft, { n: queue.length })}
              </Text>
              {q.dir === "fb" ? <Big item={q.it} onSay course={course} /> : <Text style={{ fontFamily: font.bold, fontSize: 26, color: "#FFFFFF", textAlign: "center" }}>{q.it.back}</Text>}
              <Text style={{ fontFamily: font.body, fontSize: 13, color: color.muted, textAlign: "center" }}>{q.dir === "fb" ? t.course.askMeaning : t.course.askSign}</Text>
              <View style={{ gap: 8 }}>
                {opts.map((o) => {
                  const correct = o === (q.dir === "fb" ? q.it.back : q.it.front);
                  const show = picked != null && (o === picked || correct);
                  return (
                    <Pressable key={o} accessibilityRole="button" disabled={picked != null} onPress={() => answer(o)}
                      style={{ minHeight: 54, justifyContent: "center", alignItems: "center", paddingHorizontal: 12, borderWidth: 1,
                        borderColor: show ? (correct ? color.accent : "#F6B45A") : "rgba(159,203,255,0.3)",
                        backgroundColor: show ? (correct ? "rgba(159,203,255,0.18)" : "rgba(246,180,90,0.12)") : "rgba(5,10,24,0.7)" }}>
                      <Text style={{ fontFamily: q.dir === "fb" ? font.bodyBold : undefined, fontSize: q.dir === "fb" ? 16 : o.length > 3 ? 22 : 32, color: "#FFFFFF" }}>{o}</Text>
                    </Pressable>
                  );
                })}
              </View>
              {picked != null && picked !== (q.dir === "fb" ? q.it.back : q.it.front) ? (
                <Text style={{ fontFamily: font.bodyMedium, fontSize: 13, color: "#F6B45A", textAlign: "center" }}>{fill(t.course.itWas, { front: q.it.front, back: q.it.back })}</Text>
              ) : null}
            </Frame>
          ) : null}

          {phase === "failed" ? (
            <Frame cut={14} contentStyle={{ padding: 18, gap: 12 }}>
              <Label tone="#F6B45A">{t.course.failedTitle}</Label>
              <Text style={{ fontFamily: font.body, fontSize: 14, lineHeight: 20, color: color.text }}>{t.course.failedLine}</Text>
              <SysButton label={t.course.againQuiz} onPress={() => { setQueue(questions(items)); setPhase("quiz"); }} />
            </Frame>
          ) : null}

          {phase === "done" ? (
            <Frame cut={14} contentStyle={{ padding: 18, gap: 12, alignItems: "center" }}>
              <Label tone={reward?.error ? "#F6B45A" : color.hi}>{reward?.error ? t.course.saveFailed : review ? t.course.reviewDone : t.course.passedTitle}</Label>
              {reward?.error ? <Text style={{ fontFamily: font.body, fontSize: 14, lineHeight: 20, color: color.text, textAlign: "center" }}>{t.course.saveFailedLine}</Text> : null}
              {reward?.retry ? <SysButton label={t.course.tryAgain} onPress={reward.retry} disabled={busy} /> : null}
              {!reward?.error ? <Text style={{ fontFamily: font.body, fontSize: 14, lineHeight: 20, color: color.text, textAlign: "center" }}>
                {review ? fill(t.course.reviewDoneLine, { n: Object.values(results).filter(Boolean).length, of: items.length }) : fill(t.course.passedLine, { n: items.length })}
              </Text> : null}
              {reward?.xp ? <Text style={{ fontFamily: font.num, fontSize: 16, color: color.accent }}>{`+${reward.xp} EXP`}</Text> : null}
              {reward?.quest ? <Text style={{ fontFamily: font.bodyMedium, fontSize: 13, color: color.accent, textAlign: "center" }}>{t.course.questDone}</Text> : null}
              <SysButton label={t.course.backToCourse} onPress={onClose} disabled={busy} />
            </Frame>
          ) : null}
          {mistakes && phase === "quiz" && !review ? <Text style={{ fontFamily: font.body, fontSize: 12, color: color.muted, textAlign: "center" }}>{t.course.quizNote}</Text> : null}
        </ScrollView>
      </View>
    </Modal>
  );
}
