// Quest details: what counts, the reward, and an optional log (a rep counter or a timer) before you complete it.
import { useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { completeQuest, currentDay, getQuest, rewardPreview } from "../lib/day";
import { skillById } from "../game/guild";
import { RANKS } from "../game/ladders";
import { skillView } from "../game/skills";
import { Coins, Frame, Label, SysButton } from "./sys";
import { useTheme } from "../theme";
import { t } from "../i18n";

const fill = (s, vars) => Object.entries(vars).reduce((acc, [k, v]) => acc.split(`{${k}}`).join(String(v)), s);
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

// slot: "main" | "guild" | "trial" | "start". done: already completed today.
export default function QuestSheet({ user, player, questId, slot, done, onClose, onResult }) {
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
  const reward = rewardPreview(day, questId);
  const skill = q.skill ? skillById[q.skill] : null;
  const v = q.skill && skill ? skillView(q.skill, player.skills?.[q.skill]) : null;

  const kicker = [q.stat, skill?.name?.toUpperCase(),
    q.trial ? fill(t.sheet.trial, { rank: RANKS[q.trial.rank] }) : v ? fill(t.sheet.rank, { rank: v.letter }) : null,
    q.tier ? fill(t.sheet.tier, { n: ROMAN[q.tier] }) : null].filter(Boolean).join(" · ");

  function toggleTimer() {
    if (runningSince != null) { setElapsed(seconds); setRunningSince(null); }
    else { setNow(Date.now()); setRunningSince(Date.now()); }
  }

  async function complete() {
    setBusy(true);
    setError(null);
    const log = mode === "count" && count > 0 ? { value: count, unit: "reps" } : mode === "timer" && seconds >= 1 ? { value: Math.round(seconds), unit: "seconds" } : null;
    try {
      const r = await completeQuest(user.uid, questId, slot, log);
      onResult?.(r);
      onClose();
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
              <Text style={{ fontFamily: font.body, fontSize: 13, color: color.muted }}>{t.stats[q.stat]} · {t.quests.difficulty[q.difficulty]} · {fill(t.guild.min, { n: q.minutes })}</Text>
            </View>

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

            {!done ? (
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
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
