// Quest details: what counts, the reward, and an optional log (a rep counter or a timer) before you complete it.
import { useEffect, useState } from "react";
import { Modal, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TINY_FACTOR, completeQuest, currentDay, getQuest, rewardPreview, swapMain } from "../lib/day";
import { skillById } from "../game/guild";
import { RANKS } from "../game/ladders";
import { skillView } from "../game/skills";
import { Coins, Frame, Label, SysButton } from "./sys";
import { swapPrice } from "../game/shop";
import { isHard } from "../game/hard";
import { setupMinutes } from "../game/effort";
import { courseForSkill } from "../game/courses";
import { todayKey } from "../game/quests";
import { useTheme } from "../theme";
import { t } from "../i18n";
import { tapFeel } from "../lib/haptics";
import { quickReps, quickTarget, quickToday, setItemFor } from "../game/quick";
import { quickLog } from "../lib/quick";
import { DIFF_SETS, difficultyOf } from "../game/difficulty";
import { needsWhy, whyNow } from "../game/why";

const fill = (s, vars) => Object.entries(vars ?? {}).reduce((acc, [k, v]) => acc.split(`{${k}}`).join(String(v)), String(s ?? ""));
const ROMAN = ["I", "II", "III"];
const COUNT_TYPES = ["workout", "climb"];
const pad = (n) => String(n).padStart(2, "0");
export const clock = (sec) => `${Math.floor(sec / 60)}:${pad(Math.floor(sec % 60))}`;

function Seg({ options, value, onChange }) {
  const { color, font } = useTheme();
  return (
    <View accessibilityRole="tablist" style={{ flexDirection: "row", gap: 6 }}>
      {options.map(([id, label]) => {
        const on = id === value;
        return (
          <Pressable key={id} accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={() => onChange(id)}
            style={{ flex: 1, minHeight: 40, alignItems: "center", justifyContent: "center", backgroundColor: on ? "rgba(159,203,255,0.18)" : "rgba(5,10,24,0.7)", borderWidth: 1, borderColor: on ? color.frame : "rgba(159,203,255,0.22)" }}>
            <Text style={{ fontFamily: font.bodyBold, fontSize: 13, color: on ? "#FFFFFF" : "#B8C7E3" }}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function Step({ label, onPress }) {
  const { color, font } = useTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress}
      style={({ pressed }) => ({ minWidth: 52, minHeight: 48, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(159,203,255,0.3)", backgroundColor: pressed ? "rgba(159,203,255,0.18)" : "rgba(5,10,24,0.7)" })}>
      <Text style={{ fontFamily: font.num, fontSize: 20, color: color.hi }}>{label}</Text>
    </Pressable>
  );
}

// Set-based quests: log each set when you finish it. It counts for the skill and muscles right away,
// and the quest finishes by itself when the sets are done.
function SetsPanel({ user, player, item, day, onFinished }) {
  const { color, font } = useTheme();
  const reps = quickReps(player)[item.id] ?? [];
  const n = quickToday(player)[item.id] ?? 0;
  const target = quickTarget(item, day, DIFF_SETS[difficultyOf(player)]);
  const goal = target?.goal ?? item.goal;
  const [now, setNow] = useState(reps[reps.length - 1] ?? 10);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  async function log() {
    setBusy(true);
    setErr(null);
    try {
      const r = await quickLog(user.uid, item.id, now);
      if (r.completed) onFinished(r.completed); else tapFeel();
    } catch {
      setErr(t.sheet.failed);
    } finally { setBusy(false); }
  }
  return (
    <Frame cut={12} contentStyle={{ padding: 14, gap: 12 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
        <Label tone={color.hi}>{t.sheet.sets}</Label>
        <Text style={{ fontFamily: font.num, fontSize: 16, color: "#FFFFFF" }}>{Math.min(n, goal)}<Text style={{ fontSize: 13, color: color.muted }}> / {goal}</Text></Text>
      </View>
      <Text style={{ fontFamily: font.body, fontSize: 13, lineHeight: 19, color: "#CAD6EC" }}>{t.sheet.whatSet}</Text>
      {reps.length ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
          {reps.map((r, i) => (
            <View key={i} style={{ paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: "rgba(159,203,255,0.25)" }}>
              <Text style={{ fontFamily: font.bodyMedium, fontSize: 12, color: color.text }}>{fill(t.sheet.setN, { n: i + 1, reps: r })}</Text>
            </View>
          ))}
        </View>
      ) : null}
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <Step label="−" onPress={() => setNow((c) => Math.max(1, c - 1))} />
        <View style={{ alignItems: "center" }}>
          <Text accessibilityLiveRegion="polite" style={{ fontFamily: font.num, fontSize: 48, lineHeight: 52, color: "#FFFFFF", fontVariant: ["tabular-nums"] }}>{now}</Text>
          <Text style={{ fontFamily: font.body, fontSize: 12, color: color.muted }}>{t.sheet.repsThisSet}</Text>
        </View>
        <Step label="+" onPress={() => setNow((c) => c + 1)} />
      </View>
      <SysButton label={fill(t.sheet.logSet, { n: n + 1 })} onPress={log} disabled={busy} />
      <Text style={{ fontFamily: font.body, fontSize: 12, lineHeight: 17, color: color.muted }}>{target ? t.sheet.setsFinish : t.sheet.setsCount}</Text>
      {err ? <Text style={{ fontFamily: font.bodyMedium, fontSize: 13, color: color.dangerSoft }}>{err}</Text> : null}
    </Frame>
  );
}

// slot: "main" | "guild" | "trial" | "start". done: already completed today.
export default function QuestSheet({ user, player, questId, slot, done, onClose, onResult, onOpenSkill, onOpenCourse }) {
  const { color, font } = useTheme();
  const insets = useSafeAreaInsets();
  const q = questId ? getQuest(questId) : null;
  const need = q?.trial?.need ?? null;
  const [mode, setMode] = useState(() => (need?.kind === "max" ? "timer" : need || COUNT_TYPES.includes(q?.type) ? "count" : "timer"));
  const [count, setCount] = useState(0);
  const [elapsed, setElapsed] = useState(0); // seconds, while paused
  const [runningSince, setRunningSince] = useState(null);
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (runningSince == null) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [runningSince]);

  if (!q) return null;
  const seconds = elapsed + (runningSince != null ? Math.max(0, (now - runningSince) / 1000) : 0);
  const day = currentDay(player, user.uid);
  const reward = rewardPreview(day, questId, player.profile);
  const skill = q.skill ? skillById[q.skill] : null;
  const v = q.skill && skill ? skillView(q.skill, player.skills?.[q.skill]) : null;
  const setItem = setItemFor(q);
  const setsLogged = setItem ? quickToday(player)[setItem.id] ?? 0 : 0;

  const kicker = [q.stat, skill?.name?.toUpperCase(),
    q.trial ? fill(t.sheet.trial, { rank: RANKS[q.trial.rank] }) : v ? fill(t.sheet.rank, { rank: v.letter }) : null,
    q.tier ? fill(t.sheet.tier, { n: ROMAN[q.tier] }) : null].filter(Boolean).join(" · ");

  function toggleTimer() {
    if (runningSince != null) { setElapsed(seconds); setRunningSince(null); }
    else { setNow(Date.now()); setRunningSince(Date.now()); }
  }

  // Swap this main quest for another of the same stat: the first swap of the day is free.
  const swapCost = swapPrice(player.day?.date === todayKey() ? player.day.swaps ?? 0 : 0);
  async function swap() {
    setBusy(true);
    setError(null);
    try {
      await swapMain(user.uid, questId);
      onClose();
    } catch (e) {
      setError(e.message === "no-coins" ? t.sheet.swapNoCoins : e.message === "no-other" ? t.sheet.swapNone : t.sheet.swapFailed);
    } finally { setBusy(false); }
  }

  async function complete(tiny = false) {
    setBusy(true);
    setError(null);
    const log = mode === "count" && count > 0 ? { value: count, unit: "reps" } : mode === "timer" && seconds >= 1 ? { value: Math.round(seconds), unit: "seconds" } : null;
    try {
      // Sets already logged counted their minutes; don't count them twice.
      const r = await completeQuest(user.uid, questId, slot, setItem ? null : log, { ...(setsLogged ? { quick: true } : {}), ...(tiny === true ? { tiny: true } : {}) });
      // Close the sheet first: the clear window opens once it's gone (an iPhone sheet would cover it).
      onClose();
      setTimeout(() => onResult?.(r), Platform.OS === "web" ? 0 : 380);
    } catch (e) {
      if (e.message === "below-test") setError(fill(t.sheet.below, { n: need.kind === "max" ? clock(need.value) : need.value }));
      else if (e.message === "already-done") onClose();
      else setError(t.sheet.failed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal transparent animationType="slide" visible onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "rgba(1,4,10,0.7)", justifyContent: "flex-end" }}>
        <Pressable accessibilityLabel={t.sheet.close} onPress={onClose} style={{ flex: 1 }} />
        <View style={{ maxHeight: "88%", backgroundColor: color.bg, borderTopWidth: 1, borderTopColor: "rgba(159,203,255,0.35)" }}>
          <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: insets.bottom + 18, gap: 16, maxWidth: 520, width: "100%", alignSelf: "center" }}>
            <View style={{ alignSelf: "center", width: 40, height: 4, backgroundColor: "rgba(159,203,255,0.3)" }} />
            <View style={{ gap: 6 }}>
              <Label tone={q.trial ? color.purple : color.accent}>{kicker}</Label>
              <Text accessibilityRole="header" style={{ fontFamily: font.bold, fontSize: 22, lineHeight: 28, color: "#FFFFFF" }}>{q.title}</Text>
              <Text style={{ fontFamily: font.body, fontSize: 13, color: color.muted }}>{t.stats[q.stat]} · {t.quests.difficulty[q.difficulty]} · {fill(t.guild.min, { n: q.minutes })}{setupMinutes(q) ? ` ${fill(t.sheet.setup, { n: setupMinutes(q) })}` : ""}</Text>
              {onOpenSkill && skill ? (
                <Pressable accessibilityRole="button" onPress={() => onOpenSkill(q.skill)} style={{ alignSelf: "flex-start", minHeight: 36, justifyContent: "center" }}>
                  <Text style={{ fontFamily: font.bodyBold, fontSize: 13, color: color.accent }}>{fill(t.sheet.openSkill, { skill: skill.name })}</Text>
                </Pressable>
              ) : null}
            </View>

            {/* A language with a course: the quest is done in the course (passing a set finishes it). */}
            {!done && !q.trial && !(q.tier > 0) && onOpenCourse && courseForSkill(q.skill) ? (
              <SysButton label={t.course.openCourse} onPress={() => onOpenCourse(courseForSkill(q.skill).id)} />
            ) : null}

            {/* What the quest does for you, and the 2-minute version for days without time or energy. */}
            {q.why && (done || !needsWhy(q)) ? (
              <View style={{ gap: 4 }}>
                <Label>{t.sheet.why}</Label>
                <Text style={{ fontFamily: font.body, fontSize: 14, lineHeight: 20, color: "#CAD6EC" }}>{q.why}</Text>
              </View>
            ) : null}

            {/* A hard quest comes with a reason to start now (and a quote to go with it). */}
            {!done && needsWhy(q) ? (() => { const w = whyNow(q, todayKey()); return (
              <View style={{ gap: 6, padding: 12, borderLeftWidth: 2, borderLeftColor: color.purple, backgroundColor: "rgba(168,126,255,0.07)" }}>
                <Text style={{ fontFamily: font.bold, fontSize: 11, letterSpacing: 3, color: color.purple }}>{t.sheet.whyNow}</Text>
                <Text style={{ fontFamily: font.bodyMedium, fontSize: 14, lineHeight: 20, color: "#FFFFFF" }}>{q.why ? `${q.why} ${w.line}` : w.line}</Text>
                <Text style={{ fontFamily: font.body, fontSize: 13, lineHeight: 18, color: color.text, fontStyle: "italic" }}>{`"${w.quote.text}"`}<Text style={{ fontStyle: "normal", color: color.muted }}>{`  ${w.quote.who}`}</Text></Text>
              </View>
            ); })() : null}

            {!done && q.tiny && slot === "main" ? (
              <View style={{ gap: 8, padding: 12, borderWidth: 1, borderColor: "rgba(159,203,255,0.22)" }}>
                <Label>{t.sheet.tinyTitle}</Label>
                <Text style={{ fontFamily: font.bodyMedium, fontSize: 14, lineHeight: 20, color: "#FFFFFF" }}>{q.tiny}</Text>
                <Text style={{ fontFamily: font.body, fontSize: 12, lineHeight: 17, color: color.muted }}>{fill(t.sheet.tinySub, { p: Math.round(TINY_FACTOR * 100) })}</Text>
                <Pressable accessibilityRole="button" disabled={busy} onPress={() => complete(true)}
                  style={({ pressed }) => ({ minHeight: 42, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: color.frame, backgroundColor: pressed ? "rgba(159,203,255,0.2)" : "transparent" })}>
                  <Text style={{ fontFamily: font.bold, fontSize: 12, letterSpacing: 1.5, color: "#FFFFFF" }}>{t.sheet.tinyDone}</Text>
                </Pressable>
              </View>
            ) : null}

            {q.counts ? (
              <View style={{ gap: 4 }}>
                <Label>{t.sheet.whatCounts}</Label>
                <Text style={{ fontFamily: font.body, fontSize: 14, lineHeight: 20, color: "#CAD6EC" }}>{q.counts}</Text>
              </View>
            ) : null}

            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 10, borderTopWidth: 1, borderBottomWidth: 1, borderColor: color.line }}>
              <Label>{t.sheet.reward}</Label>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <Coins value={reward.coins} sign="+" size={18} />
                <Text style={{ fontFamily: font.num, fontSize: 18, color: color.accent }}>+{reward.xp} <Text style={{ fontSize: 13 }}>{t.status.exp}</Text></Text>
              </View>
            </View>

            {!done && setItem ? (
              <SetsPanel user={user} player={player} item={setItem} day={day} onFinished={(r) => { onClose(); setTimeout(() => onResult?.(r), Platform.OS === "web" ? 0 : 380); }} />
            ) : !done ? (
              <Frame cut={12} contentStyle={{ padding: 14, gap: 12 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
                  <Label tone={color.hi}>{t.sheet.log}</Label>
                  <Text style={{ fontFamily: font.body, fontSize: 12, color: color.muted }}>{t.sheet.optional}</Text>
                </View>
                <Seg options={[["count", t.sheet.count], ["timer", t.sheet.timer]]} value={mode} onChange={setMode} />
                {mode === "count" ? (
                  <View style={{ gap: 10 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                      <Step label="−" onPress={() => setCount((c) => Math.max(0, c - 1))} />
                      <View style={{ alignItems: "center" }}>
                        <Text accessibilityLiveRegion="polite" style={{ fontFamily: font.num, fontSize: 56, lineHeight: 60, color: "#FFFFFF", fontVariant: ["tabular-nums"] }}>{count}</Text>
                        <Text style={{ fontFamily: font.body, fontSize: 12, color: color.muted }}>{t.sheet.reps}</Text>
                      </View>
                      <Step label="+" onPress={() => setCount((c) => c + 1)} />
                    </View>
                    <View style={{ flexDirection: "row", gap: 6, justifyContent: "center" }}>
                      {[5, 10, 25].map((n) => <Step key={n} label={`+${n}`} onPress={() => setCount((c) => c + n)} />)}
                      <Step label="0" onPress={() => setCount(0)} />
                    </View>
                  </View>
                ) : (
                  <View style={{ alignItems: "center", gap: 10 }}>
                    <Text accessibilityLiveRegion="polite" style={{ fontFamily: font.num, fontSize: 56, lineHeight: 60, color: "#FFFFFF", fontVariant: ["tabular-nums"] }}>{clock(seconds)}</Text>
                    <Text style={{ fontFamily: font.body, fontSize: 12, color: color.muted }}>{fill(t.sheet.goal, { n: q.minutes })}</Text>
                    <View style={{ flexDirection: "row", gap: 8, alignSelf: "stretch" }}>
                      <SysButton label={runningSince != null ? t.sheet.pause : t.sheet.start} onPress={toggleTimer} style={{ flex: 1 }} />
                      <Pressable accessibilityRole="button" onPress={() => { setElapsed(0); setRunningSince(null); }}
                        style={{ minHeight: 50, paddingHorizontal: 16, alignItems: "center", justifyContent: "center" }}>
                        <Text style={{ fontFamily: font.bodyBold, fontSize: 14, color: color.muted }}>{t.sheet.reset}</Text>
                      </Pressable>
                    </View>
                  </View>
                )}
                {need ? (
                  <Text style={{ fontFamily: font.body, fontSize: 12, lineHeight: 17, color: color.muted }}>
                    {fill(need.kind === "max" ? t.sheet.needMax : t.sheet.needMin, { n: need.kind === "max" ? clock(need.value) : need.value })}
                  </Text>
                ) : null}
              </Frame>
            ) : null}

            {error ? <Text style={{ fontFamily: font.bodyMedium, fontSize: 13, color: color.dangerSoft }}>{error}</Text> : null}
            {done ? (
              <Text style={{ fontFamily: font.bodyBold, fontSize: 14, color: color.frame, textAlign: "center" }}>{t.sheet.done}</Text>
            ) : (
              <SysButton label={q.trial ? t.sheet.completeTrial : t.sheet.complete} onPress={complete} disabled={busy} />
            )}
            {slot === "main" && !done && isHard(player) ? (
              <Text style={{ fontFamily: font.body, fontSize: 12, color: color.muted, textAlign: "center" }}>{t.hard.noSwap}</Text>
            ) : slot === "main" && !done ? (
              <Pressable accessibilityRole="button" disabled={busy} onPress={swap} style={{ minHeight: 44, alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontFamily: font.bodyBold, fontSize: 13, color: color.muted }}>
                  {swapCost ? fill(t.sheet.swapCost, { n: swapCost }) : t.sheet.swapFree}
                </Text>
              </Pressable>
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
