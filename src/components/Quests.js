// Quest board (design v0.1, version B): one System window with today's goals, the reward and the penalty warning.
import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Pressable, ScrollView, Text, View } from "react-native";
import Svg, { Polygon } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { completeQuest, currentDay, getQuest, rewardPreview } from "../lib/day";
import { questById } from "../game/quests";
import Guild from "./Guild";
import { requestUrgent } from "../lib/urgent";
import { ECONOMY } from "../game/economy";
import { Coins, Frame, Glow, HexBadge, HexCheck, Label, SysButton, nativeDriver } from "./sys";
import LevelUp from "./LevelUp";
import RankUp from "./RankUp";
import QuestSheet from "./QuestSheet";
import { BodyReport } from "./Body";
import CheckIn from "./CheckIn";
import GymSession from "./GymSession";
import Schedule from "./Schedule";
import { busyBlocks, hhmm, suggestTimes } from "../game/schedule";
import QuickLog from "./QuickLog";
import { QUICK, goalFor, quickToday } from "../game/quick";
import { dayNum, trialQuestId, trialState, weekNum } from "../game/skills";
import { dutiesToday } from "../game/profile";
import { ASK_SLOTS, needsProof } from "../game/proof";
import { completeTroll, useTrolls } from "../lib/social";
import { trollById, trollQueue, trollXp } from "../game/social";
import { RANKS, ladderById as ladders } from "../game/ladders";
import { skillById } from "../game/guild";
import { useTheme } from "../theme";
import { t } from "../i18n";
import { doneFeel } from "../lib/haptics";
import { HelpDot } from "./Explain";

const fill = (s, vars) => Object.entries(vars).reduce((acc, [k, v]) => acc.split(`{${k}}`).join(String(v)), s);
const DEADLINE_HOUR = 21;
const pad = (n) => String(n).padStart(2, "0");

function useDeadline() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  const end = new Date(now);
  end.setHours(DEADLINE_HOUR, 0, 0, 0);
  const left = Math.floor((end - now) / 1000);
  if (left <= 0) return null;
  return `${pad(Math.floor(left / 3600))}:${pad(Math.floor(left / 60) % 60)}:${pad(left % 60)}`;
}

// One of the three raised hexagons at the top: a main quest's stat, lit when it's done.
function QuestHex({ stat, done }) {
  const { color, font } = useTheme();
  return (
    <View style={{ width: 92, height: 100, alignItems: "center" }}>
      <Svg width={92} height={96}>
        <Polygon points="46,79 76,62 76,72 46,89" fill={done ? "rgba(150,200,255,0.45)" : "rgba(150,200,255,0.14)"} />
        <Polygon points="46,79 16,62 16,72 46,89" fill={done ? "rgba(150,200,255,0.3)" : "rgba(150,200,255,0.08)"} />
        <Polygon points="46,9 76,26 76,62 46,79 16,62 16,26" fill={done ? "rgba(111,168,238,0.6)" : "rgba(8,16,32,0.95)"}
          stroke={done ? color.hi : "rgba(159,203,255,0.5)"} strokeWidth={1.5} />
        <Polygon points="46,21 66,32.5 66,55.5 46,67 26,55.5 26,32.5" fill="none"
          stroke={done ? "rgba(255,255,255,0.5)" : "rgba(159,203,255,0.25)"} strokeWidth={1} strokeDasharray="2 3" />
      </Svg>
      <View style={{ position: "absolute", top: 30, left: 0, right: 0, alignItems: "center" }}>
        <Text style={{ fontFamily: font.bold, fontSize: 16, letterSpacing: 1, color: done ? "#FFFFFF" : color.muted }}>{stat}</Text>
        <Text style={{ fontFamily: font.bold, fontSize: 10, color: done ? color.hi : color.muted }}>{done ? t.board.clear : t.board.open}</Text>
      </View>
    </View>
  );
}

function GoalRow({ questId, done, busy, onDone, onOpen, last, quick, time }) {
  const { color, font } = useTheme();
  const q = getQuest(questId);
  // Quick logs count toward the quest: show taps instead of minutes.
  const a = quick ? Math.min(quick.count, quick.goal) : done ? q.minutes : 0;
  const b = quick ? quick.goal : q.minutes;
  const ratio = done ? 1 : b ? a / b : 0;
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, paddingLeft: 14, paddingRight: 8,
      borderBottomWidth: last ? 0 : 1, borderBottomColor: color.line, opacity: done ? 0.55 : 1 }}>
      <HexBadge w={34} h={38} label={q.stat} labelSize={10} />
      <Pressable accessibilityRole="button" accessibilityHint={t.board.openHint} onPress={onOpen} style={({ pressed }) => ({ flex: 1, gap: 5, opacity: pressed ? 0.7 : 1 })}>
        <Text style={{ fontFamily: font.bold, fontSize: 16, lineHeight: 21, color: "#FFFFFF" }}>{q.title}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <View style={{ flex: 1, height: 3, backgroundColor: "rgba(159,203,255,0.12)" }}>
            <View style={{ height: 3, width: `${ratio * 100}%`, backgroundColor: color.accent }} />
          </View>
          <Text style={{ fontFamily: font.num, fontSize: 15, color: color.frame }}>
            {quick ? fill(t.board.progressQuick, { a: done ? b : a, b, unit: quick.unit }) : fill(t.board.progress, { a, b })}
          </Text>
        </View>
        <Text style={{ fontFamily: font.body, fontSize: 12, color: color.muted }}>
          {t.stats[q.stat]} · {t.quests.difficulty[q.difficulty]}{time != null && !done ? `  ·  ${fill(t.schedule.around, { time: hhmm(time) })}` : ""}
        </Text>
      </Pressable>
      <HexCheck done={done} disabled={busy} onPress={onDone}
        label={fill(done ? t.board.isDone : t.board.markDone, { title: q.title })} />
    </View>
  );
}

export default function Quests({ user, player, focus, onFocusDone, onOpenSkill }) {
  const { color, font } = useTheme();
  const insets = useSafeAreaInsets();
  const day = currentDay(player, user.uid);
  const countdown = useDeadline();
  const [busy, setBusy] = useState(false);
  const [guild, setGuild] = useState(false);
  const guildOpen = day.guild.filter((g) => !g.done);
  const guildDone = day.guild.filter((g) => g.done);
  const urgentOpen = ["offered", "active", "followup"].includes(player.urgent?.status);
  const [toast, setToast] = useState(null);
  const [levelUp, setLevelUp] = useState(null);
  const [rankUp, setRankUp] = useState(null);
  const [body, setBody] = useState(null); // body report after a quest that trained muscles
  const [check, setCheck] = useState(null); // check-in after an important quest: { logId, title }
  // Opened from somewhere else (a quest just accepted in the guild): start with that quest open.
  const [sheet, setSheet] = useState(focus ?? null); // { id, slot, done }
  useEffect(() => {
    if (focus) onFocusDone?.();
  }, [focus, onFocusDone]);

  // Active rank trials, with the parts still to do.
  const trials = Object.entries(player.trials ?? {}).map(([skillId, tr]) => {
    const st = ladders[skillId] ? trialState(tr, ladders[skillId], player.skills?.[skillId]?.ticks) : null;
    return st ? { skillId, ...st } : null;
  }).filter(Boolean);
  const duties = dutiesToday(player, day.date, weekNum(dayNum(day.date)));
  const trollQ = trollQueue(useTrolls(user.uid));
  // Suggested times for open main quests, in your free time today (from now on).
  const [schedOpen, setSchedOpen] = useState(false);
  const busyToday = busyBlocks(player, day.date);
  const nowD = new Date();
  const times = suggestTimes(day.mains.filter((m) => !m.done).map((m) => ({ id: m.id, minutes: getQuest(m.id)?.minutes })), player, day.date, nowD.getHours() + nowD.getMinutes() / 60);
  const toastAnim = useRef(new Animated.Value(0)).current;

  const quickCounts = quickToday(player);
  const quickFor = (questId) => {
    const item = QUICK.find((it) => (Array.isArray(it.quest) ? it.quest : [it.quest]).includes(questId));
    return item ? { count: quickCounts[item.id] ?? 0, goal: goalFor(item, questId), unit: item.goalUnit } : null;
  };
  const mainsDone = day.mains.filter((m) => m.done).length;
  const allDone = mainsDone === day.mains.length;
  const pct = Math.round(ECONOMY.allMainsBonus * 100);
  const openRewards = day.mains.filter((m) => !m.done).map((m) => rewardPreview(day, m.id, player.profile));
  const rewardCoins = openRewards.reduce((a, r) => a + r.coins, 0);
  const rewardXp = openRewards.reduce((a, r) => a + r.xp, 0);

  function showToast(next) {
    setToast(next);
    toastAnim.setValue(0);
    Animated.sequence([
      Animated.timing(toastAnim, { toValue: 1, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: nativeDriver }),
      Animated.delay(1800),
      Animated.timing(toastAnim, { toValue: 0, duration: 400, useNativeDriver: nativeDriver }),
    ]).start(({ finished }) => finished && setToast(null));
  }

  function onResult(r, questId) {
    showToast({ coins: r.coins + r.bonus, bonus: r.bonus, xp: r.xp });
    if (r.levelUp) setLevelUp({ level: r.levelUp, xp: (player.xp ?? 0) + r.xp, coins: r.coins + r.bonus });
    const q = getQuest(questId);
    const proof = needsProof(player, r.slot);
    const ask = ASK_SLOTS.includes(r.slot);
    if ((proof || ask) && r.logId) setCheck({ logId: r.logId, title: q?.title ?? "", proof, ask });
    if (r.muscles) setBody({ ...r.muscles, skillId: q?.skill, skillName: skillById[q?.skill]?.name ?? "" });
    if (r.skillUp) setRankUp({ letter: RANKS[r.skillUp.rank], name: skillById[r.skillUp.id]?.name ?? "", xp: r.skillUp.xp });
    else if (r.trialDone && q?.skill) setRankUp({ letter: RANKS[q.trial.rank], name: skillById[q.skill]?.name ?? "", xp: 0, restored: true });
  }

  async function complete(questId, slot) {
    setBusy(true);
    try {
      const r = await completeQuest(user.uid, questId, slot);
      doneFeel();
      onResult(r, questId);
    } catch (e) {
      if (e.message !== "already-done") showToast({ error: true });
    } finally {
      setBusy(false);
    }
  }

  if (guild) return <Guild user={user} player={player} onClose={() => setGuild(false)} onAccepted={(id) => { setGuild(false); setSheet({ id, slot: "guild" }); }} />;

  return (
    <View style={{ flex: 1, backgroundColor: color.bg }}>
      <ScrollView style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: insets.top + 14, paddingBottom: 40, maxWidth: 520, width: "100%", alignSelf: "center" }}>
        <Glow height={440} at={0.26} />

        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 18 }}>
          <Label tone={color.hi} style={{ letterSpacing: 5, fontSize: 12 }}>{t.status.system}</Label>
          <Coins value={player.coins ?? 0} size={18} />
        </View>

        <View style={{ alignItems: "center", gap: 4, marginTop: 20 }}>
          <Text accessibilityRole="header" style={{ fontFamily: font.bold, fontSize: 26, letterSpacing: 1, color: "#FFFFFF" }}>{t.board.title}</Text>
          <Text style={{ fontFamily: font.body, fontSize: 14, color: color.muted }}>{fill(t.board.sub, { n: day.mains.length, pct })}</Text>
        </View>

        <View style={{ flexDirection: "row", justifyContent: "center", gap: 4, marginTop: 16 }}>
          {day.mains.map((m) => <QuestHex key={m.id} stat={getQuest(m.id)?.stat ?? "STR"} done={m.done} />)}
        </View>

        {!day.start.done ? (
          <Frame style={{ marginTop: 14, marginHorizontal: 14 }} cut={10} contentStyle={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 8, paddingLeft: 16, paddingRight: 8 }}>
            <View style={{ flex: 1, gap: 3 }}>
              <Label tone={color.accent}>{t.board.start}</Label>
              <Text style={{ fontFamily: font.bodyMedium, fontSize: 15, color: color.text }}>{questById.start.title}</Text>
            </View>
            <HexCheck size={34} disabled={busy} onPress={() => complete("start", "start")}
              label={fill(t.board.markDone, { title: questById.start.title })} />
          </Frame>
        ) : null}

        <QuickLog user={user} player={player} day={day} onCompleted={onResult} style={{ marginTop: 14, marginHorizontal: 14 }} />

        <Frame kind="premium" cut={16} corners style={{ marginTop: 14, marginHorizontal: 14 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", paddingHorizontal: 16, paddingTop: 14, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: "rgba(159,203,255,0.18)" }}>
            <Label tone={color.hi} style={{ letterSpacing: 4, fontSize: 12 }}>{t.board.goals}</Label>
            <Text style={{ fontFamily: font.num, fontSize: 18, color: color.frame }}>
              {mainsDone}<Text style={{ fontSize: 14, color: color.muted }}> / {day.mains.length}</Text>
            </Text>
          </View>
          {busyToday.length || player.schedule?.length ? (
            <Pressable accessibilityRole="button" onPress={() => setSchedOpen(true)} style={{ paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: color.line }}>
              <Text style={{ fontFamily: font.body, fontSize: 12, lineHeight: 17, color: color.muted }}>
                {busyToday.length ? fill(t.schedule.busyLine, { list: busyToday.map((b) => `${b.label} ${hhmm(b.start)}–${hhmm(b.end)}`).join(", ") }) : t.schedule.freeLine}
                <Text style={{ fontFamily: font.bodyBold, color: color.accent }}>{`  ${t.schedule.edit}`}</Text>
              </Text>
            </Pressable>
          ) : null}
          {day.mains.map((m, i) => (
            <GoalRow key={m.id} questId={m.id} done={m.done} busy={busy} last={i === day.mains.length - 1} time={times[m.id]}
              onDone={() => complete(m.id, "main")} onOpen={() => setSheet({ id: m.id, slot: "main", done: m.done })} quick={quickFor(m.id)} />
          ))}
          <View style={{ paddingHorizontal: 16, paddingVertical: 12, gap: 8, borderTopWidth: 1, borderTopColor: color.line }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Label>{t.board.reward}</Label>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                <Coins value={rewardCoins} sign="+" size={18} />
                <Text style={{ fontFamily: font.num, fontSize: 18, color: color.accent }}>+{rewardXp} <Text style={{ fontSize: 13 }}>{t.status.exp}</Text></Text>
              </View>
            </View>
            <Text style={{ fontFamily: font.body, fontSize: 12, color: color.muted }}>
              {fill(t.board.bonusLine, { n: day.mains.length, pct })}
            </Text>
          </View>
          {allDone ? (
            <View style={{ paddingHorizontal: 16, paddingVertical: 13, borderTopWidth: 1, borderTopColor: "rgba(235,200,110,0.4)", alignItems: "center" }}>
              <Label tone={color.reward}>{fill(t.board.allClear, { bonus: Math.round(day.mainCoins * ECONOMY.allMainsBonus) })}</Label>
            </View>
          ) : (
            <View style={{ paddingHorizontal: 16, paddingVertical: 12, gap: 4, borderTopWidth: 1, borderTopColor: "rgba(255,46,69,0.35)", backgroundColor: "rgba(255,46,69,0.08)" }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Label tone={color.danger} style={{ letterSpacing: 4, fontSize: 12 }}>{t.board.warning}</Label>
                  <HelpDot term="penalty" size={18} />
                </View>
                {countdown ? (
                  <Text style={{ fontFamily: font.num, fontSize: 20, color: color.danger, fontVariant: ["tabular-nums"] }}>{countdown}</Text>
                ) : null}
              </View>
              <Text style={{ fontFamily: font.body, fontSize: 13, lineHeight: 18, color: "#E6B3B9" }}>
                {countdown ? fill(t.board.warningText, { time: `${DEADLINE_HOUR}:00` }) : t.board.deadlinePassed}
              </Text>
            </View>
          )}
        </Frame>

        <View style={{ marginTop: 18, marginHorizontal: 14, gap: 12 }}>
          {trials.length ? (
            <Frame cut={12} tone={color.purple}>
              <View style={{ paddingHorizontal: 14, paddingTop: 12, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: color.line }}>
                <Label tone={color.hi}>{t.board.trials}</Label>
              </View>
              {trials.map((tr) => (
                <View key={tr.skillId} style={{ paddingTop: 10 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 14 }}>
                    <Text style={{ fontFamily: font.bold, fontSize: 11, letterSpacing: 1.5, color: color.purple }}>{fill(t.board.trialOf, { skill: skillById[tr.skillId].name.toUpperCase(), rank: RANKS[tr.rank] })}</Text>
                    <Text style={{ fontFamily: font.body, fontSize: 12, color: color.muted }}>{tr.daysLeft != null ? fill(t.skills.trialActive, { n: tr.daysLeft }) : t.skills.trialWaiting}</Text>
                  </View>
                  {tr.parts.map((p) => {
                    const id = trialQuestId(tr.skillId, tr.rank, p.key);
                    return (
                      <View key={p.key} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 8, paddingLeft: 14, paddingRight: 8, opacity: p.done ? 0.55 : 1 }}>
                        <Pressable accessibilityRole="button" accessibilityHint={t.board.openHint} onPress={() => setSheet({ id, slot: "trial", done: p.done })}
                          style={({ pressed }) => ({ flex: 1, opacity: pressed ? 0.7 : 1 })}>
                          <Text style={{ fontFamily: font.bold, fontSize: 15, lineHeight: 20, color: "#FFFFFF" }}>{p.text}</Text>
                          {p.value != null ? <Text style={{ fontFamily: font.num, fontSize: 14, color: color.accent }}>{p.value}</Text> : null}
                        </Pressable>
                        <HexCheck size={30} done={p.done} disabled={busy} onPress={() => complete(id, "trial")} label={fill(p.done ? t.board.isDone : t.board.markDone, { title: p.text })} />
                      </View>
                    );
                  })}
                </View>
              ))}
              <View style={{ height: 6 }} />
            </Frame>
          ) : null}
          {trollQ.active.length ? (
            <Frame cut={12}>
              <View style={{ paddingHorizontal: 14, paddingTop: 12, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: color.line, gap: 2 }}>
                <Label tone={color.hi}>{t.troll.board}</Label>
                <Text style={{ fontFamily: font.body, fontSize: 12, lineHeight: 17, color: color.muted }}>{t.troll.boardSub}</Text>
              </View>
              {trollQ.active.map((tr, i) => {
                const x = trollById[tr.troll];
                if (!x) return null;
                return (
                  <View key={tr.id} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, paddingLeft: 14, paddingRight: 8,
                    borderBottomWidth: i === trollQ.active.length - 1 && !trollQ.waiting.length ? 0 : 1, borderBottomColor: color.line }}>
                    <View style={{ flex: 1, gap: 4 }}>
                      <Text style={{ fontFamily: font.bold, fontSize: 15, lineHeight: 20, color: "#FFFFFF" }}>{x.title}</Text>
                      <Text style={{ fontFamily: font.body, fontSize: 12, color: color.muted }}>{fill(t.troll.from, { name: tr.fromName, xp: trollXp(x), level: t.troll.levels[x.level] })}</Text>
                    </View>
                    <HexCheck size={30} done={false} disabled={busy} label={fill(t.board.markDone, { title: x.title })}
                      onPress={() => completeTroll(user.uid, tr).then((r) => { if (r) { doneFeel(); showToast({ coins: 0, bonus: 0, xp: r.xp }); if (r.levelUp) setLevelUp({ level: r.levelUp, xp: (player.xp ?? 0) + r.xp, coins: 0 }); } }).catch(() => showToast({ error: true }))} />
                  </View>
                );
              })}
              {trollQ.waiting.length ? (
                <Text style={{ paddingHorizontal: 14, paddingVertical: 10, fontFamily: font.body, fontSize: 12, color: color.muted }}>{fill(t.troll.waiting, { n: trollQ.waiting.length })}</Text>
              ) : null}
            </Frame>
          ) : null}
          {duties.length ? (
            <Frame cut={12}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", paddingHorizontal: 14, paddingTop: 12, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: color.line }}>
                <Label tone={color.hi}>{t.board.duties}</Label>
                <Text style={{ fontFamily: font.num, fontSize: 16, color: color.frame }}>{duties.filter((d) => d.done).length}<Text style={{ fontSize: 13, color: color.muted }}> / {duties.length}</Text></Text>
              </View>
              {[...duties.filter((d) => !d.done), ...duties.filter((d) => d.done)].map((d, i, all) => {
                const id = `d:${d.id}`;
                const r = rewardPreview(day, id, player.profile);
                return (
                  <View key={id} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, paddingLeft: 14, paddingRight: 8, opacity: d.done ? 0.55 : 1,
                    borderBottomWidth: i === all.length - 1 ? 0 : 1, borderBottomColor: color.line }}>
                    <Pressable accessibilityRole="button" accessibilityHint={t.board.openHint} onPress={() => setSheet({ id, slot: "duty", done: d.done })}
                      style={({ pressed }) => ({ flex: 1, gap: 4, opacity: pressed ? 0.7 : 1 })}>
                      <Text style={{ fontFamily: font.bold, fontSize: 15, lineHeight: 20, color: "#FFFFFF" }}>{d.name}</Text>
                      <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
                        <Text style={{ fontFamily: font.body, fontSize: 12, color: color.muted }}>{d.done ? t.board.dutyDone[d.freq] : t.board.dutyFreq[d.freq]}</Text>
                        {d.done ? null : <Coins value={r.coins} sign="+" size={14} />}
                      </View>
                    </Pressable>
                    <HexCheck size={30} done={d.done} disabled={busy} onPress={() => complete(id, "duty")}
                      label={fill(d.done ? t.board.isDone : t.board.markDone, { title: d.name })} />
                  </View>
                );
              })}
            </Frame>
          ) : null}
          {day.guild.length ? (
            <Frame cut={12}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", paddingHorizontal: 14, paddingTop: 12, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: color.line }}>
                <Label tone={color.hi}>{t.board.guildQuests}</Label>
                <Text style={{ fontFamily: font.num, fontSize: 16, color: color.frame }}>{guildDone.length}<Text style={{ fontSize: 13, color: color.muted }}> / {day.guild.length}</Text></Text>
              </View>
              {[...guildOpen, ...guildDone].map((g, i, all) => {
                const q = getQuest(g.id);
                if (!q) return null;
                const r = rewardPreview(day, g.id, player.profile);
                return (
                  <View key={g.id} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, paddingLeft: 14, paddingRight: 8, opacity: g.done ? 0.55 : 1,
                    borderBottomWidth: i === all.length - 1 ? 0 : 1, borderBottomColor: color.line }}>
                    <HexBadge w={30} h={34} label={q.stat} labelSize={9} />
                    <Pressable accessibilityRole="button" accessibilityHint={t.board.openHint} onPress={() => setSheet({ id: g.id, slot: "guild", done: g.done })}
                      style={({ pressed }) => ({ flex: 1, gap: 4, opacity: pressed ? 0.7 : 1 })}>
                      <Text style={{ fontFamily: font.bold, fontSize: 15, lineHeight: 20, color: "#FFFFFF" }}>{q.title}</Text>
                      {g.done ? null : (
                        <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
                          <Coins value={r.coins} sign="+" size={15} />
                          <Text style={{ fontFamily: font.num, fontSize: 15, color: color.accent }}>+{r.xp} {t.status.exp}</Text>
                        </View>
                      )}
                    </Pressable>
                    <HexCheck size={34} done={g.done} disabled={busy} onPress={() => complete(g.id, "guild")}
                      label={fill(g.done ? t.board.isDone : t.board.markDone, { title: q.title })} />
                  </View>
                );
              })}
              <Text style={{ fontFamily: font.body, fontSize: 12, color: color.muted, paddingHorizontal: 14, paddingBottom: 10 }}>{t.board.guildHint}</Text>
            </Frame>
          ) : null}
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            <Text style={{ flex: 1, fontFamily: font.body, fontSize: 14, color: color.muted }}>{t.board.guildTitle}</Text>
            <SysButton label={t.board.guildButton.toUpperCase()} onPress={() => setGuild(true)} />
          </View>
          <Pressable accessibilityRole="button" disabled={busy || urgentOpen} onPress={async () => {
            setBusy(true);
            try { await requestUrgent(user.uid); } catch (e) { showToast({ error: true, text: t.urgent.open }); } finally { setBusy(false); }
          }} style={{ minHeight: 52, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 14, borderWidth: 1, borderColor: "rgba(246,180,90,0.45)", backgroundColor: "rgba(246,180,90,0.06)", opacity: urgentOpen ? 0.5 : 1 }}>
            <View style={{ width: 8, height: 8, backgroundColor: "#F6B45A", transform: [{ rotate: "45deg" }] }} />
            <View style={{ flex: 1 }}>
              <Text style={{ fontFamily: font.bold, fontSize: 14, color: "#F6B45A" }}>{t.urgent.ask}</Text>
              <Text style={{ fontFamily: font.body, fontSize: 12, color: color.muted }}>{urgentOpen ? t.urgent.open : t.urgent.askHint}</Text>
            </View>
          </Pressable>
        </View>
      </ScrollView>

      {toast ? (
        <Animated.View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, top: insets.top + 54, alignItems: "center",
          opacity: toastAnim, transform: [{ translateY: toastAnim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] }}>
          <Frame kind="premium" cut={10} contentStyle={{ flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 10, paddingHorizontal: 16 }}>
            {toast.error ? (
              <Text style={{ fontFamily: font.bodyMedium, fontSize: 14, color: color.danger }}>{toast.text ?? t.quests.error}</Text>
            ) : (
              <>
                {toast.coins ? <Coins value={toast.coins} sign="+" size={22} /> : null}
                <Text style={{ fontFamily: font.num, fontSize: 22, color: color.accent }}>+{toast.xp} <Text style={{ fontSize: 14 }}>{t.status.exp}</Text></Text>
              </>
            )}
          </Frame>
        </Animated.View>
      ) : null}

      {schedOpen ? <Schedule user={user} player={player} onClose={() => setSchedOpen(false)} /> : null}
      {sheet && sheet.id.startsWith("gs:") && !sheet.done ? (
        <GymSession user={user} player={player} questId={sheet.id} slot={sheet.slot} onClose={() => setSheet(null)} onResult={(r) => onResult(r, sheet.id)} />
      ) : null}
      {sheet && !(sheet.id.startsWith("gs:") && !sheet.done) ? <QuestSheet user={user} player={player} questId={sheet.id} slot={sheet.slot} done={sheet.done} onClose={() => setSheet(null)} onResult={(r) => onResult(r, sheet.id)}
        onOpenSkill={onOpenSkill ? (id) => { const from = { id: sheet.id, slot: sheet.slot }; setSheet(null); onOpenSkill(id, from); } : null} /> : null}
      <CheckIn uid={user.uid} data={check} onClose={() => setCheck(null)} />
      <BodyReport data={check ? null : body} onClose={() => setBody(null)} onOpenSkill={onOpenSkill} />
      <RankUp data={check || body ? null : rankUp} onClose={() => setRankUp(null)} />
      <LevelUp data={check || body || rankUp ? null : levelUp} onClose={() => setLevelUp(null)} />
    </View>
  );
}
