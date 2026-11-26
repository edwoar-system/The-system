// Quest board (design v0.1, version B): one System window with today's goals, the reward and the penalty warning.
import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Modal, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { END_PARTS, FREE_FIT_SWAPS, boardSource, commitTomorrow, doChallenge, buyExtraTime, refreshOpenMains, completeQuest, currentDay, getQuest, rewardPreview, swapToFit, tickStart } from "../lib/day";
import { useSituation } from "../lib/location";
import { useWeather } from "../lib/weather";
import { fitsSituation, isOutdoor } from "../game/effort";
import SituationLine from "./SituationLine";
import { logCheck } from "../lib/habits";
import { dayEndHour, extraPrice } from "../game/penalty";
import { isHard } from "../game/hard";
import { quickLog } from "../lib/quick";
import { SIDE_BONUS, todayKey } from "../game/quests";
import { activeAppTime } from "../game/shop";
import Guild from "./Guild";
import { requestUrgent } from "../lib/urgent";
import { ECONOMY } from "../game/economy";
import { Coins, Frame, Glow, HexBadge, HexCheck, Label, nativeDriver } from "./sys";
import LevelUp from "./LevelUp";
import RankUp from "./RankUp";
import QuestSheet from "./QuestSheet";
import { BodyReport } from "./Body";
import CheckIn from "./CheckIn";
import GymSession from "./GymSession";
import Schedule from "./Schedule";
import { busyBlocks, hhmm, suggestTimes } from "../game/schedule";
import QuickLog from "./QuickLog";
import Hud from "./Hud";
import { courseForSkill } from "../game/courses";
import { needsWelcome } from "./Welcome";
import FirstQuests from "./FirstQuests";
import { needsFirst } from "../game/firstQuests";
import MorningCheckin from "./MorningCheckin";
import { CHALLENGE_COINS, FULL_MORNING_XP, challengeOf, morningById, morningToday, wantsCheckin } from "../game/morning";
import { minutesOf, reminderDone, remindersOn } from "../game/reminders";
import { tickReminder } from "../lib/player";
import { showClear, showSystem } from "../lib/popup";
import { QUICK, goalFor, quickToday } from "../game/quick";
import { dayNum, trialQuestId, trialState, weekNum } from "../game/skills";
import { dutiesToday, dutyDay } from "../game/profile";
import { ASK_SLOTS, needsProof } from "../game/proof";
import { useTrolls } from "../lib/social";
import { trollById, trollNeedsProof, trollQueue, trollTitleFor, trollXp } from "../game/social";
import TrollDo from "./TrollDo";
import { RANKS, ladderById as ladders } from "../game/ladders";
import { skillById } from "../game/guild";
import { useTheme } from "../theme";
import { t } from "../i18n";
import { doneFeel, tapFeel } from "../lib/haptics";
import { HelpDot } from "./Explain";

const fill = (s, vars) => Object.entries(vars ?? {}).reduce((acc, [k, v]) => acc.split(`{${k}}`).join(String(v)), String(s ?? ""));
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


function GoalRow({ questId, done, busy, onDone, onOpen, last, quick, time, notice }) {
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
        {notice && !done ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <Text style={{ fontFamily: font.bodyMedium, fontSize: 12, lineHeight: 17, color: "#F6B45A" }}>{notice.text}</Text>
            {notice.action ? (
              <Pressable accessibilityRole="button" disabled={busy} onPress={notice.onAction} hitSlop={8}>
                <Text style={{ fontFamily: font.bodyBold, fontSize: 12, color: color.accent }}>{notice.action}</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </Pressable>
      <HexCheck done={done} disabled={busy} onPress={onDone}
        label={fill(done ? t.board.isDone : t.board.markDone, { title: q.title })} />
    </View>
  );
}

// The one quest to do now: the first open main quest that fits where you are, in the order of today's free time.
// "What do I do now?" is answered before anything else on the screen.
function NowCard({ questId, time, nowHour, reward, quickItem, quick, notice, busy, onStart, onDone, onQuick }) {
  const { color, font } = useTheme();
  const q = getQuest(questId);
  if (!q) return null;
  const when = time == null || time <= nowHour + 0.25 ? t.now.freeNow : fill(t.schedule.around, { time: hhmm(time) });
  return (
    <Frame kind="premium" cut={16} corners style={{ marginTop: 12, marginHorizontal: 14 }} contentStyle={{ padding: 16, gap: 10 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
        <Label tone={color.accent} style={{ letterSpacing: 4, fontSize: 12 }}>{t.now.title}</Label>
        <Text style={{ fontFamily: font.bodyBold, fontSize: 12, color: color.muted }}>{when}</Text>
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <HexBadge w={38} h={42} label={q.stat} labelSize={11} lit />
        <Pressable accessibilityRole="button" accessibilityHint={t.board.openHint} onPress={onStart} style={({ pressed }) => ({ flex: 1, gap: 4, opacity: pressed ? 0.7 : 1 })}>
          <Text style={{ fontFamily: font.bold, fontSize: 19, lineHeight: 24, color: "#FFFFFF" }}>{q.title}</Text>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <Text style={{ fontFamily: font.body, fontSize: 12, color: color.muted }}>{`${t.quests.difficulty[q.difficulty]} · ${fill(t.now.minutes, { n: q.minutes })}`}</Text>
            <Coins value={reward.coins} sign="+" size={14} />
            <Text style={{ fontFamily: font.num, fontSize: 14, color: color.accent }}>{`+${reward.xp} ${t.status.exp}`}</Text>
          </View>
          {quick ? <Text style={{ fontFamily: font.num, fontSize: 14, color: color.frame }}>{fill(t.board.progressQuick, { a: Math.min(quick.count, quick.goal), b: quick.goal, unit: quick.unit })}</Text> : null}
        </Pressable>
      </View>
      {notice ? <Text style={{ fontFamily: font.bodyMedium, fontSize: 12, lineHeight: 17, color: "#F6B45A" }}>{notice.text}</Text> : null}
      <View style={{ flexDirection: "row", gap: 8 }}>
        {quickItem ? (
          <Pressable accessibilityRole="button" disabled={busy} onPress={onQuick}
            style={({ pressed }) => ({ flex: 1, minHeight: 46, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: color.frame, backgroundColor: pressed ? "rgba(159,203,255,0.22)" : "rgba(159,203,255,0.1)" })}>
            <Text style={{ fontFamily: font.bold, fontSize: 13, letterSpacing: 1, color: "#FFFFFF" }}>{fill(t.now.plusOne, { what: t.now.quickShort[quickItem.id] ?? quickItem.label.toUpperCase() })}</Text>
          </Pressable>
        ) : null}
        <Pressable accessibilityRole="button" disabled={busy} onPress={onStart}
          style={({ pressed }) => ({ flex: 1, minHeight: 46, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: color.frame, backgroundColor: pressed ? "rgba(159,203,255,0.22)" : "transparent" })}>
          <Text style={{ fontFamily: font.bold, fontSize: 13, letterSpacing: 2, color: "#FFFFFF" }}>{t.now.start}</Text>
        </Pressable>
        <HexCheck size={46} done={false} disabled={busy} onPress={onDone} label={fill(t.board.markDone, { title: q.title })} />
      </View>
    </Frame>
  );
}

// Morning, afternoon, evening: where a suggested time falls.
const partOfDay = (h) => (h == null ? "any" : h < 12 ? "morning" : h < 17 ? "afternoon" : "evening");

export default function Quests({ user, player, focus, onFocusDone, onOpenSkill, onOpenCourse, onOpenAssess }) {
  const { color, font } = useTheme();
  const insets = useSafeAreaInsets();
  const day = currentDay(player, user.uid);
  const countdown = useDeadline();
  const [busy, setBusy] = useState(false);
  const [guild, setGuild] = useState(false);
  // Program sessions: their own list (boards made before this keep them among the mains until tomorrow).
  const programList = day.programs ?? [];
  const urgentOpen = ["offered", "active", "followup"].includes(player.urgent?.status);
  const [toast, setToast] = useState(null);
  const [levelUp, setLevelUp] = useState(null);
  const [rankUp, setRankUp] = useState(null);
  const [body, setBody] = useState(null); // body report after a quest that trained muscles
  const [check, setCheck] = useState(null); // check-in after an important quest: { logId, title }
  // Opened from somewhere else (a quest just accepted in the guild): start with that quest open.
  // It opens a moment later: on the iPhone a new window can't open while the one you came from (the Guild,
  // a skill page) is still closing, and trying to crashes the app.
  const [sheet, setSheet] = useState(null); // { id, slot, done }
  const focusTimer = useRef(null);
  const [trollOpen, setTrollOpen] = useState(null);
  const [fab, setFab] = useState(false);
  const sit = useSituation(player)?.id ?? null;
  const weather = useWeather(player);
  const freeFits = FREE_FIT_SWAPS - (day.fitSwaps ?? 0);
  // A main quest that doesn't fit where you are, or an outdoor one in bad weather: say so, offer a free swap.
  function noticeFor(id) {
    const q = getQuest(id);
    if (!q) return null;
    const misfit = sit && !fitsSituation(q, sit);
    const wet = weather?.bad && isOutdoor(q);
    if (!misfit && !wet) return null;
    const text = misfit ? fill(t.fit.notNow, { where: t.fit.situations[sit] }) : fill(freeFits > 0 ? t.fit.badWeather : t.fit.badWeatherGo, { why: t.fit.weather[weather.bad] });
    return { text, action: freeFits > 0 ? (misfit ? t.fit.swapFree : t.fit.swapIndoor) : null, onAction: () => fitSwap(id, !!wet) };
  }
  async function fitSwap(id, wet) {
    setBusy(true);
    try { await swapToFit(user.uid, id, sit, !wet); tapFeel(); }
    catch (e) { showToast({ error: true, text: e.message === "no-other" ? t.fit.noOther : e.message === "no-free" ? t.fit.noFree : null }); }
    finally { setBusy(false); }
  }
  useEffect(() => {
    if (!focus) return;
    const f = focus;
    onFocusDone?.();
    focusTimer.current = setTimeout(() => setSheet(f), 600);
  }, [focus, onFocusDone]);
  useEffect(() => () => clearTimeout(focusTimer.current), []);

  // Active rank trials, with the parts still to do.
  const trials = Object.entries(player.trials ?? {}).map(([skillId, tr]) => {
    const st = ladders[skillId] ? trialState(tr, ladders[skillId], player.skills?.[skillId]?.ticks) : null;
    return st ? { skillId, ...st } : null;
  }).filter(Boolean);
  // Duties already on the main board today (a weekly one on its day) only show up there.
  const duties = dutiesToday(player, day.date, weekNum(dayNum(day.date))).filter((d) => !day.mains.some((m) => m.id === `d:${d.id}`));
  const trollQ = trollQueue(useTrolls(user.uid));
  // Suggested times for open main quests, in your free time today (from now on).
  const [schedOpen, setSchedOpen] = useState(false);
  const busyToday = busyBlocks(player, day.date);
  const nowD = new Date();
  // The bedtime quest shows up when the day ends (an hour before bed).
  const endH = dayEndHour(player.profile) + (day.extraMin ?? 0) / 60;
  const bedtime = nowD.getHours() + nowD.getMinutes() / 60 >= endH;
  const extraCost = extraPrice(day, isHard(player));
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
  const [showCleared, setShowCleared] = useState(false);
  const todaysReminders = remindersOn(player);
  const morningNow = morningToday(player, day);
  const committed = player.commit?.date === todayKey(new Date(Date.now() + 86400000)) && !!player.commit?.nophone;
  // Quests you do bit by bit all day (water) are never the "Now" quest unless nothing else is left.
  const allDayIds = new Set(QUICK.filter((it) => it.allDay).flatMap((it) => (Array.isArray(it.quest) ? it.quest : [it.quest])));
  const nowHour = nowD.getHours() + nowD.getMinutes() / 60;
  // Open main quests in the order of today's free time; the ones that don't fit where you are go last.
  const openMains = day.mains.filter((m) => !m.done)
    .map((m) => ({ ...m, time: times[m.id] ?? null, misfit: !!noticeFor(m.id), allDay: allDayIds.has(m.id) }))
    .sort((a, b) => (a.misfit - b.misfit) || (a.allDay - b.allDay) || ((a.time ?? 99) - (b.time ?? 99)));
  const clearedMains = day.mains.filter((m) => m.done);
  const nowQuest = openMains[0] ?? null;
  const quickItemFor = (questId) => QUICK.find((it) => (Array.isArray(it.quest) ? it.quest : [it.quest]).includes(questId)) ?? null;
  async function nowQuick(questId) {
    const item = quickItemFor(questId);
    if (!item || busy) return;
    setBusy(true);
    try {
      const r = await quickLog(user.uid, item.id);
      if (r.completed) onResult(r.completed, r.completedQuest ?? questId);
      else tapFeel();
    } catch { showToast({ error: true }); } finally { setBusy(false); }
  }

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
    const q = getQuest(questId);
    // The clear window first; level ups, rank ups, the body report and the check-in follow when it closes
    // (an iPhone sheet would cover the window otherwise).
    const next = () => {
      if (r.levelUp) setLevelUp({ level: r.levelUp, xp: (player.xp ?? 0) + r.xp, coins: r.coins + r.bonus });
      const proof = needsProof(player, r.slot);
      const ask = ASK_SLOTS.includes(r.slot);
      if ((proof || ask) && r.logId) setCheck({ logId: r.logId, title: q?.title ?? "", proof, ask });
      if (r.muscles) setBody({ ...r.muscles, skillId: q?.skill, skillName: skillById[q?.skill]?.name ?? "" });
      if (r.skillUp) setRankUp({ letter: RANKS[r.skillUp.rank], name: skillById[r.skillUp.id]?.name ?? "", xp: r.skillUp.xp });
      else if (r.trialDone && q?.skill) setRankUp({ letter: RANKS[q.trial.rank], name: skillById[q.skill]?.name ?? "", xp: 0, restored: true });
    };
    showClear({ title: r.morningFull ? t.morning.fullTitle : q?.title ?? r.title, coins: r.coins + r.bonus, bonus: r.bonus, xp: r.xp + (r.morningFull ? FULL_MORNING_XP : 0), streak: r.streak, allClear: r.allClear, morningFull: !!r.morningFull, loot: r.loot ?? null, then: next });
  }

  async function complete(questId, slot) {
    setBusy(true);
    try {
      const r = await completeQuest(user.uid, questId, slot);
      onResult(r, questId); // the clear window plays its own sound
    } catch (e) {
      if (e.message !== "already-done") showToast({ error: true });
    } finally {
      setBusy(false);
    }
  }

  // Start of the day (bed, water) and bedtime (teeth, phone away, tomorrow ready) are checklists.
  // The water tick counts as a glass and the teeth tick as the teeth habit, so everything moves together.
  async function tickPart(part, which) {
    setBusy(true);
    try {
      const ticks = await tickStart(user.uid, part, which);
      // Water in the morning counts as glasses toward today's water (500 ml = 2 glasses).
      if (which === "start" && morningById[part]?.water) {
        for (let i = 0; i < morningById[part].water; i++) {
          const w = await quickLog(user.uid, "water").catch(() => null);
          if (w?.completed) { onResult(w.completed, w.completedQuest); break; }
        }
      }
      if (which === "end" && part === "teeth") await logCheck(user.uid, "teeth").catch(() => null);
      const parts = which === "end" ? END_PARTS : morningNow.items;
      if (parts.every((p) => ticks[p])) {
        const r = await completeQuest(user.uid, which, which);
        doneFeel();
        onResult(r, which);
      }
    } catch (e) {
      if (e.message !== "already-done") showToast({ error: true });
    } finally {
      setBusy(false);
    }
  }

  // More time: pushes today's deadline back 30 minutes for coins.
  async function moreTime() {
    setBusy(true);
    try {
      const r = await buyExtraTime(user.uid, t.board.moreTimeLog);
      tapFeel();
      showToast({ note: fill(t.board.moreTimeDone, { n: r.cost, time: hhmm(endH + 0.5) }) });
    } catch (e) {
      showToast({ error: true, text: e.message === "no-coins" ? t.board.moreTimeNoCoins : e.message === "too-late" ? t.board.moreTimeLate : null });
    } finally {
      setBusy(false);
    }
  }

  // The daily morning challenge: optional, a few coins and EXP.
  async function challenge() {
    setBusy(true);
    try {
      const r = await doChallenge(user.uid);
      doneFeel();
      showSystem({ title: t.morning.challengeDone, lines: [t.morning.challenges[challengeOf(day.date, user.uid)], fill(t.morning.challengeReward, { c: r.coins, x: r.xp })], tone: "buff" });
    } catch (e) {
      if (e.message !== "already-done") showToast({ error: true });
    } finally {
      setBusy(false);
    }
  }

  function checklist(which, parts, ticks) {
    const words = which === "end" ? t.board.endParts : t.morning.items;
    return (
      <Frame style={{ marginTop: 14, marginHorizontal: 14 }} cut={10} contentStyle={{ paddingVertical: 10, paddingHorizontal: 16, gap: 6 }}>
        <Label tone={color.accent}>{which === "end" ? t.board.end : t.board.start}</Label>
        {which === "end" ? <Text style={{ fontFamily: font.body, fontSize: 12, lineHeight: 17, color: color.muted }}>{t.board.endSub}</Text> : null}
        {parts.map((part) => {
          const on = !!ticks?.[part];
          return (
            <View key={part} style={{ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 44 }}>
              <View style={{ flex: 1, gap: 1 }}>
                <Text style={{ fontFamily: font.bodyMedium, fontSize: 15, color: on ? color.muted : color.text }}>{words[part]}</Text>
                {which === "start" && part === "water" && !on ? <Text style={{ fontFamily: font.body, fontSize: 11, color: color.muted }}>{t.board.startWater}</Text> : null}
              </View>
              <HexCheck size={30} done={on} disabled={busy || on} onPress={() => tickPart(part, which)}
                label={fill(on ? t.board.isDone : t.board.markDone, { title: words[part] })} />
            </View>
          );
        })}
        {which === "start" && morningNow.challenge ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 48, marginTop: 4, paddingTop: 8, borderTopWidth: 1, borderTopColor: color.line }}>
            <View style={{ flex: 1, gap: 1 }}>
              <Text style={{ fontFamily: font.bold, fontSize: 10, letterSpacing: 2, color: color.purple }}>{fill(t.morning.challengeLabel, { c: CHALLENGE_COINS })}</Text>
              <Text style={{ fontFamily: font.bodyMedium, fontSize: 15, color: day.challengeDone ? color.muted : color.text }}>{t.morning.challenges[challengeOf(day.date, user.uid)]}</Text>
            </View>
            <HexCheck size={30} done={!!day.challengeDone} disabled={busy || !!day.challengeDone} onPress={challenge}
              label={fill(day.challengeDone ? t.board.isDone : t.board.markDone, { title: t.morning.challenges[challengeOf(day.date, user.uid)] })} />
          </View>
        ) : null}
      </Frame>
    );
  }

  // Opens a quest. A quest done in a course (Japanese: the next set) goes straight to that course.
  function openQuest(x) {
    const q = getQuest(x.id);
    const course = !x.done && q && !q.trial && !(q.tier > 0) ? courseForSkill(q.skill) : null;
    if (course && onOpenCourse) { onOpenCourse(course.id, null); return; }
    setSheet(x);
  }

  // A list of extra quests (guild, programs): title, done count, rows with reward and a check.
  function questList(title, list, slot, hint) {
    const open = list.filter((g) => !g.done);
    const done = list.filter((g) => g.done);
    return (
      <Frame cut={12}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", paddingHorizontal: 14, paddingTop: 12, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: color.line }}>
          <Label tone={color.hi}>{title}</Label>
          <Text style={{ fontFamily: font.num, fontSize: 16, color: color.frame }}>{done.length}<Text style={{ fontSize: 13, color: color.muted }}> / {list.length}</Text></Text>
        </View>
        {[...open, ...done].map((g, i, all) => {
          const q = getQuest(g.id);
          if (!q) return null;
          const r = rewardPreview(day, g.id, player.profile);
          return (
            <View key={g.id} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, paddingLeft: 14, paddingRight: 8, opacity: g.done ? 0.55 : 1,
              borderBottomWidth: i === all.length - 1 ? 0 : 1, borderBottomColor: color.line }}>
              <HexBadge w={30} h={34} label={q.stat} labelSize={9} />
              <Pressable accessibilityRole="button" accessibilityHint={t.board.openHint} onPress={() => openQuest({ id: g.id, slot, done: g.done })}
                style={({ pressed }) => ({ flex: 1, gap: 4, opacity: pressed ? 0.7 : 1 })}>
                <Text style={{ fontFamily: font.bold, fontSize: 15, lineHeight: 20, color: "#FFFFFF" }}>{q.title}</Text>
                {g.done ? null : (
                  <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
                    <Coins value={r.coins} sign="+" size={15} />
                    <Text style={{ fontFamily: font.num, fontSize: 15, color: color.accent }}>+{r.xp} {t.status.exp}</Text>
                  </View>
                )}
              </Pressable>
              <HexCheck size={34} done={g.done} disabled={busy} onPress={() => complete(g.id, slot)}
                label={fill(g.done ? t.board.isDone : t.board.markDone, { title: q.title })} />
            </View>
          );
        })}
        <Text style={{ fontFamily: font.body, fontSize: 12, color: color.muted, paddingHorizontal: 14, paddingBottom: 10 }}>{hint}</Text>
      </Frame>
    );
  }

  // New players: first quests until the System knows them (game/firstQuests.js).
  if (needsFirst(player)) {
    return (
      <View style={{ flex: 1, backgroundColor: color.bg }}>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingTop: insets.top + 14, paddingBottom: 96, maxWidth: 520, width: "100%", alignSelf: "center" }}>
          <Glow height={440} at={0.26} />
          <Hud user={user} player={player} />
          <FirstQuests user={user} player={player} onOpenAssess={onOpenAssess} />
        </ScrollView>
      </View>
    );
  }

  if (guild) return <Guild user={user} player={player} onClose={() => setGuild(false)} onAccepted={(id) => { setGuild(false); focusTimer.current = setTimeout(() => setSheet({ id, slot: "guild" }), 600); }} />;

  return (
    <View style={{ flex: 1, backgroundColor: color.bg }}>
      <ScrollView style={{ flex: 1 }}
        contentContainerStyle={{ paddingTop: insets.top + 14, paddingBottom: 96, maxWidth: 520, width: "100%", alignSelf: "center" }}>
        <Glow height={440} at={0.26} />

        <Hud user={user} player={player} />
        <SituationLine user={user} player={player} situation={sit} weather={weather} />

        {nowQuest ? (
          <NowCard questId={nowQuest.id} time={nowQuest.time} nowHour={nowHour} reward={rewardPreview(day, nowQuest.id, player.profile)}
            quickItem={quickItemFor(nowQuest.id)} quick={quickFor(nowQuest.id)} notice={noticeFor(nowQuest.id)} busy={busy}
            onStart={() => openQuest({ id: nowQuest.id, slot: "main", done: false })} onDone={() => complete(nowQuest.id, "main")} onQuick={() => nowQuick(nowQuest.id)} />
        ) : null}

        {day.checkin?.plan ? (
          <Text style={{ marginTop: 10, marginHorizontal: 18, fontFamily: font.bodyMedium, fontSize: 13, color: color.text }}>
            <Text style={{ fontFamily: font.bold, fontSize: 10, letterSpacing: 2, color: color.accent }}>{`${t.morning.planLabel}  `}</Text>{day.checkin.plan}
          </Text>
        ) : null}
        {/* Your morning (Settings → Morning), as much as the check-in said there's time for. */}
        {!day.start.done && (morningNow.items.length || morningNow.challenge) ? checklist("start", morningNow.items, day.startTicks) : null}
        {day.start.done && morningNow.challenge && !day.challengeDone && nowD.getHours() < 13 ? checklist("start", [], day.startTicks) : null}

        {/* Your own reminders for today (Settings), to tick off. */}
        {todaysReminders.length ? (
          <Frame style={{ marginTop: 14, marginHorizontal: 14 }} cut={10} contentStyle={{ paddingVertical: 10, paddingHorizontal: 16, gap: 4 }}>
            <Label tone={color.accent}>{t.reminders.board}</Label>
            {todaysReminders.map((r) => {
              const on = reminderDone(player, r.id);
              const due = !on && minutesOf(r.time) <= nowD.getHours() * 60 + nowD.getMinutes();
              return (
                <View key={r.id} style={{ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 44 }}>
                  <Text style={{ width: 48, fontFamily: font.num, fontSize: 15, color: due ? "#F6B45A" : on ? color.muted : color.accent }}>{r.time}</Text>
                  <Text style={{ flex: 1, fontFamily: font.bodyMedium, fontSize: 15, color: on ? color.muted : color.text, textDecorationLine: on ? "line-through" : "none" }}>{r.text}</Text>
                  <HexCheck size={30} done={on} disabled={on} onPress={() => { tapFeel(); tickReminder(user.uid, player, r.id).catch(() => showToast({ error: true })); }}
                    label={fill(on ? t.board.isDone : t.board.markDone, { title: r.text })} />
                </View>
              );
            })}
          </Frame>
        ) : null}
        {bedtime && !day.end?.done ? checklist("end", END_PARTS, day.endTicks) : null}

        {/* Tomorrow: commit tonight to a phone-free first hour (it starts the moment you wake, so it's chosen the day before). */}
        {nowD.getHours() >= 17 ? (
          <Frame style={{ marginTop: 14, marginHorizontal: 14 }} cut={10} contentStyle={{ paddingVertical: 12, paddingHorizontal: 16, gap: 8 }}>
            <Label tone={color.accent}>{t.commit.title}</Label>
            <Text style={{ fontFamily: font.bodyBold, fontSize: 15, color: "#FFFFFF" }}>{t.commit.nophone}</Text>
            <Text style={{ fontFamily: font.body, fontSize: 12, lineHeight: 17, color: committed ? "#F6B45A" : color.muted }}>{committed ? t.commit.warningOn : t.commit.warning}</Text>
            <Pressable accessibilityRole="button" disabled={busy} onPress={() => { tapFeel(); commitTomorrow(user.uid, !committed).catch(() => showToast({ error: true })); }}
              style={({ pressed }) => ({ minHeight: 44, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: committed ? "rgba(159,203,255,0.3)" : color.frame,
                backgroundColor: pressed ? "rgba(159,203,255,0.2)" : committed ? "transparent" : "rgba(159,203,255,0.1)" })}>
              <Text style={{ fontFamily: font.bold, fontSize: 13, letterSpacing: 1.5, color: committed ? color.muted : "#FFFFFF" }}>{committed ? t.commit.undo : t.commit.go}</Text>
            </Pressable>
          </Frame>
        ) : null}

        <QuickLog user={user} player={player} day={day} situation={sit} onCompleted={onResult} style={{ marginTop: 14, marginHorizontal: 14 }} />

        <Frame kind="premium" cut={16} corners style={{ marginTop: 14, marginHorizontal: 14 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", paddingHorizontal: 16, paddingTop: 14, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: "rgba(159,203,255,0.18)" }}>
            <Label tone={color.hi} style={{ letterSpacing: 4, fontSize: 12 }}>{t.board.goals}</Label>
            <Text style={{ fontFamily: font.num, fontSize: 18, color: color.frame }}>
              {mainsDone}<Text style={{ fontSize: 14, color: color.muted }}> / {day.mains.length}</Text>
            </Text>
          </View>
          {mainsDone < day.mains.length && !bedtime ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: color.line }}>
              <Text style={{ flex: 1, fontFamily: font.body, fontSize: 12, lineHeight: 17, color: color.muted }}>
                {fill(day.extraMin ? t.board.endsExtra : t.board.ends, { time: hhmm(endH), n: day.extraMin ?? 0 })}
              </Text>
              {extraCost != null ? (
                <Pressable accessibilityRole="button" disabled={busy} onPress={moreTime}
                  style={({ pressed }) => ({ minHeight: 36, paddingHorizontal: 10, justifyContent: "center", borderWidth: 1, borderColor: "rgba(159,203,255,0.3)", backgroundColor: pressed ? "rgba(159,203,255,0.15)" : "transparent" })}>
                  <Text style={{ fontFamily: font.bodyBold, fontSize: 12, color: color.text }}>{fill(t.board.moreTime, { n: extraCost })}</Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}
          {/* Your Tune answers or difficulty changed since this board was made: offer to update the open quests. */}
          {day.source && day.source !== boardSource(player) && day.mains.some((m) => !m.done) ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: color.line, backgroundColor: "rgba(159,203,255,0.06)" }}>
              <Text style={{ flex: 1, fontFamily: font.body, fontSize: 12, lineHeight: 17, color: color.text }}>{t.board.retune}</Text>
              <Pressable accessibilityRole="button" disabled={busy} onPress={async () => {
                setBusy(true);
                try { const r = await refreshOpenMains(user.uid); tapFeel(); showToast({ note: r.changed ? fill(t.board.retuned, { n: r.changed }) : t.board.retunedNone }); }
                catch { showToast({ error: true }); } finally { setBusy(false); }
              }} style={({ pressed }) => ({ minHeight: 36, paddingHorizontal: 10, justifyContent: "center", borderWidth: 1, borderColor: color.frame, backgroundColor: pressed ? "rgba(159,203,255,0.18)" : "transparent" })}>
                <Text style={{ fontFamily: font.bodyBold, fontSize: 12, color: color.text }}>{t.board.retuneGo}</Text>
              </Pressable>
            </View>
          ) : null}
          {/* Agenda today: your schedule (with today's changes) and your iPhone Calendar. Tap to change today. */}
          <Pressable accessibilityRole="button" accessibilityHint={t.schedule.agendaHint} onPress={() => setSchedOpen(true)}
            style={{ paddingHorizontal: 16, paddingVertical: 10, gap: 4, borderBottomWidth: 1, borderBottomColor: color.line }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
              <Text style={{ fontFamily: font.bold, fontSize: 11, letterSpacing: 2, color: color.hi }}>{t.schedule.agenda}</Text>
              <Text style={{ fontFamily: font.bodyBold, fontSize: 12, color: color.accent }}>{t.schedule.changeToday}</Text>
            </View>
            {busyToday.length ? busyToday.slice(0, 5).map((b) => {
              const nowH = nowD.getHours() + nowD.getMinutes() / 60;
              const now = nowH >= b.start && nowH < b.end;
              const past = nowH >= b.end;
              return (
                <Text key={b.id} style={{ fontFamily: now ? font.bodyBold : font.body, fontSize: 13, lineHeight: 19, color: now ? "#FFFFFF" : past ? color.muted : color.text, opacity: past ? 0.6 : 1 }}>
                  <Text style={{ fontFamily: font.num, color: now ? color.accent : color.muted }}>{`${hhmm(b.start)}–${hhmm(b.end)}  `}</Text>
                  {b.label ?? t.schedule.calendarEvent}{now ? `  ·  ${t.schedule.now}` : ""}
                </Text>
              );
            }) : <Text style={{ fontFamily: font.body, fontSize: 13, color: color.muted }}>{player.schedule?.length || player.calendarOn ? t.schedule.freeLine : t.schedule.setUp}</Text>}
            {busyToday.length > 5 ? <Text style={{ fontFamily: font.body, fontSize: 12, color: color.muted }}>{fill(t.schedule.more, { n: busyToday.length - 5 })}</Text> : null}
          </Pressable>
          {/* The rest of today, by part of the day. The Now quest is on top already. */}
          {openMains.filter((m) => m.id !== nowQuest?.id).map((m, i, list) => {
            const part = partOfDay(m.time);
            const head = i === 0 || partOfDay(list[i - 1].time) !== part;
            return (
              <View key={m.id}>
                {head ? <Text style={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 2, fontFamily: font.bold, fontSize: 10, letterSpacing: 3, color: color.muted }}>{t.now.parts[part]}</Text> : null}
                <GoalRow questId={m.id} done={false} busy={busy} last={i === list.length - 1 && !clearedMains.length} time={m.time}
                  onDone={() => complete(m.id, "main")} onOpen={() => openQuest({ id: m.id, slot: "main", done: false })} quick={quickFor(m.id)} notice={noticeFor(m.id)} />
              </View>
            );
          })}
          {nowQuest && openMains.length === 1 ? <Text style={{ paddingHorizontal: 16, paddingVertical: 10, fontFamily: font.body, fontSize: 13, color: color.muted }}>{t.now.onlyOne}</Text> : null}
          {clearedMains.length ? (
            <Pressable accessibilityRole="button" accessibilityState={{ expanded: showCleared }} onPress={() => setShowCleared((v) => !v)}
              style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", minHeight: 44, paddingHorizontal: 16, borderTopWidth: 1, borderTopColor: color.line }}>
              <Text style={{ fontFamily: font.bold, fontSize: 11, letterSpacing: 2, color: color.purple }}>{fill(t.now.cleared, { n: clearedMains.length })}</Text>
              <Text style={{ fontFamily: font.bodyBold, fontSize: 14, color: color.muted }}>{showCleared ? "▾" : "▸"}</Text>
            </Pressable>
          ) : null}
          {showCleared ? clearedMains.map((m, i) => (
            <GoalRow key={m.id} questId={m.id} done busy={busy} last={i === clearedMains.length - 1} time={null}
              onDone={() => complete(m.id, "main")} onOpen={() => setSheet({ id: m.id, slot: "main", done: true })} quick={quickFor(m.id)} notice={null} />
          )) : null}
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
          {/* Guild quests you took sit right under your goals, not at the bottom. */}
          {day.guild.length ? questList(t.board.guildQuests, day.guild, "guild", t.board.guildHint) : null}
          {/* Program sessions: extra side quests from the programs you follow (they don't count for the streak). */}
          {programList.length ? questList(t.board.programQuests, programList, "program", t.board.programHint) : null}
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
          {day.side ? (
            <Frame cut={12}>
              <View style={{ paddingHorizontal: 14, paddingTop: 12, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: color.line, gap: 2 }}>
                <Label tone={color.hi}>{t.board.side}</Label>
                <Text style={{ fontFamily: font.body, fontSize: 12, lineHeight: 17, color: color.muted }}>{t.board.sideSub}</Text>
              </View>
              {(() => {
                const q = getQuest(day.side.id);
                if (!q) return null;
                const r = rewardPreview(day, day.side.id, player.profile);
                const done = day.side.done;
                return (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, paddingLeft: 14, paddingRight: 8, opacity: done ? 0.55 : 1 }}>
                    <HexBadge w={30} h={34} label={q.stat} labelSize={9} />
                    <Pressable accessibilityRole="button" accessibilityHint={t.board.openHint} onPress={() => setSheet({ id: day.side.id, slot: "side", done })} style={({ pressed }) => ({ flex: 1, gap: 4, opacity: pressed ? 0.7 : 1 })}>
                      <Text style={{ fontFamily: font.bold, fontSize: 15, lineHeight: 20, color: "#FFFFFF" }}>{q.title}</Text>
                      {done ? null : <Coins value={Math.round(r.coins * (1 + SIDE_BONUS))} sign="+" size={14} />}
                    </Pressable>
                    <HexCheck size={30} done={done} disabled={busy || done} onPress={() => complete(day.side.id, "side")}
                      label={fill(done ? t.board.isDone : t.board.markDone, { title: q.title })} />
                  </View>
                );
              })()}
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
                const title = trollTitleFor(x, player);
                return (
                  <Pressable key={tr.id} accessibilityRole="button" accessibilityHint={t.board.openHint} onPress={() => setTrollOpen(tr)}
                    style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, paddingLeft: 14, paddingRight: 14, opacity: pressed ? 0.75 : 1,
                      borderBottomWidth: i === trollQ.active.length - 1 && !trollQ.waiting.length ? 0 : 1, borderBottomColor: color.line })}>
                    <View style={{ flex: 1, gap: 4 }}>
                      <Text style={{ fontFamily: font.bold, fontSize: 15, lineHeight: 20, color: "#FFFFFF" }}>{title}</Text>
                      <Text style={{ fontFamily: font.body, fontSize: 12, color: color.muted }}>{fill(t.troll.from, { name: tr.fromName, xp: trollXp(x), level: t.troll.levels[x.level] })}</Text>
                      {trollNeedsProof(x) ? <Text style={{ fontFamily: font.body, fontSize: 12, color: "#F6B45A" }}>{x.place ? fill(t.troll.proofPlace, { place: t.troll.places[x.place] }) : t.troll.proofPhoto}</Text> : null}
                    </View>
                    <Text style={{ fontFamily: font.bold, fontSize: 18, color: color.muted }}>›</Text>
                  </Pressable>
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
                        <Text style={{ fontFamily: font.body, fontSize: 12, color: color.muted }}>{d.done ? t.board.dutyDone[d.freq] : d.freq === "weekly" ? fill(t.board.dutyOn, { day: t.board.dayNames[dutyDay(player.profile, d.id)] }) : t.board.dutyFreq[d.freq]}</Text>
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
        </View>
      </ScrollView>

      {/* Always in reach while you scroll: ask for a quest (urgent, or one from the guild). */}
      <Pressable accessibilityRole="button" accessibilityLabel={t.board.fab} onPress={() => { tapFeel(); setFab(true); }}
        style={({ pressed }) => ({ position: "absolute", right: 14, bottom: activeAppTime(player) ? 56 : 14, minHeight: 52, paddingHorizontal: 18, flexDirection: "row", alignItems: "center", gap: 8,
          borderWidth: 1, borderColor: color.frame, backgroundColor: pressed ? "rgba(30,50,90,0.98)" : "rgba(8,16,34,0.96)", shadowColor: color.blue, shadowOpacity: 0.5, shadowRadius: 14 })}>
        <Text style={{ fontFamily: font.bold, fontSize: 22, color: color.accent, marginTop: -2 }}>+</Text>
        <Text style={{ fontFamily: font.bold, fontSize: 13, letterSpacing: 1.5, color: "#FFFFFF" }}>{t.board.fab}</Text>
      </Pressable>
      {fab ? (
        <Modal transparent animationType="fade" visible onRequestClose={() => setFab(false)}>
          <Pressable accessibilityLabel={t.board.fabClose} onPress={() => setFab(false)} style={{ flex: 1, backgroundColor: "rgba(1,4,10,0.6)", justifyContent: "flex-end" }}>
            <View style={{ padding: 14, paddingBottom: insets.bottom + 70, gap: 10, maxWidth: 520, width: "100%", alignSelf: "center" }}>
              <Pressable accessibilityRole="button" disabled={busy || urgentOpen} onPress={async () => {
                setFab(false);
                setBusy(true);
                try { await requestUrgent(user.uid); } catch (e) { showToast({ error: true, text: e?.message === "no-skills" ? t.urgent.noSkills : t.urgent.open }); } finally { setBusy(false); }
              }} style={{ minHeight: 60, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, borderWidth: 1, borderColor: "rgba(246,180,90,0.6)", backgroundColor: "rgba(20,14,6,0.97)", opacity: urgentOpen ? 0.5 : 1 }}>
                <View style={{ width: 8, height: 8, backgroundColor: "#F6B45A", transform: [{ rotate: "45deg" }] }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: font.bold, fontSize: 15, color: "#F6B45A" }}>{t.urgent.ask}</Text>
                  <Text style={{ fontFamily: font.body, fontSize: 12, color: color.muted }}>{urgentOpen ? t.urgent.open : t.urgent.askHint}</Text>
                </View>
              </Pressable>
              <Pressable accessibilityRole="button" onPress={() => { setFab(false); setGuild(true); }}
                style={{ minHeight: 60, flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, borderWidth: 1, borderColor: color.frame, backgroundColor: "rgba(8,16,34,0.97)" }}>
                <View style={{ width: 8, height: 8, backgroundColor: color.accent, transform: [{ rotate: "45deg" }] }} />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontFamily: font.bold, fontSize: 15, color: "#FFFFFF" }}>{t.board.guildButton}</Text>
                  <Text style={{ fontFamily: font.body, fontSize: 12, color: color.muted }}>{t.board.guildTitle}</Text>
                </View>
              </Pressable>
            </View>
          </Pressable>
        </Modal>
      ) : null}

      {toast ? (
        <Animated.View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, top: insets.top + 54, alignItems: "center",
          opacity: toastAnim, transform: [{ translateY: toastAnim.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] }}>
          <Frame kind="premium" cut={10} contentStyle={{ flexDirection: "row", alignItems: "center", gap: 14, paddingVertical: 10, paddingHorizontal: 16 }}>
            {toast.error ? (
              <Text style={{ fontFamily: font.bodyMedium, fontSize: 14, color: color.danger }}>{toast.text ?? t.quests.error}</Text>
            ) : toast.note ? (
              <Text style={{ fontFamily: font.bodyMedium, fontSize: 14, color: color.accent }}>{toast.note}</Text>
            ) : (
              <>
                {toast.coins ? <Coins value={toast.coins} sign="+" size={22} /> : null}
                <Text style={{ fontFamily: font.num, fontSize: 22, color: color.accent }}>+{toast.xp} <Text style={{ fontSize: 14 }}>{t.status.exp}</Text></Text>
              </>
            )}
          </Frame>
        </Animated.View>
      ) : null}

      {trollOpen ? <TrollDo user={user} player={player} troll={trollOpen} onClose={() => setTrollOpen(null)}
        onDone={(r) => { if (r) { showToast({ coins: 0, bonus: 0, xp: r.xp }); if (r.levelUp) setLevelUp({ level: r.levelUp, xp: (player.xp ?? 0) + r.xp, coins: 0 }); } }} /> : null}
      {schedOpen ? <Schedule user={user} player={player} onClose={() => setSchedOpen(false)} /> : null}
      {sheet && sheet.id.startsWith("gs:") && !sheet.done ? (
        <GymSession user={user} player={player} questId={sheet.id} slot={sheet.slot} onClose={() => setSheet(null)} onResult={(r) => onResult(r, sheet.id)} />
      ) : null}
      {sheet && !(sheet.id.startsWith("gs:") && !sheet.done) ? <QuestSheet user={user} player={player} questId={sheet.id} slot={sheet.slot} done={sheet.done} onClose={() => setSheet(null)} onResult={(r) => onResult(r, sheet.id)}
        onOpenSkill={onOpenSkill ? (id) => { const from = { id: sheet.id, slot: sheet.slot }; setSheet(null); onOpenSkill(id, from); } : null}
        onOpenCourse={onOpenCourse ? (id) => { const from = { id: sheet.id, slot: sheet.slot }; setSheet(null); onOpenCourse(id, from); } : null} /> : null}
      <CheckIn uid={user.uid} data={check} onClose={() => setCheck(null)} />
      <BodyReport data={check ? null : body} onClose={() => setBody(null)} onOpenSkill={onOpenSkill} />
      <RankUp data={check || body ? null : rankUp} onClose={() => setRankUp(null)} />
      {!sheet && !check && !body && !levelUp && !rankUp && !needsWelcome(player) && wantsCheckin(player, day, nowD) ? <MorningCheckin user={user} player={player} /> : null}
      <LevelUp data={check || body || rankUp ? null : levelUp} onClose={() => setLevelUp(null)} />
    </View>
  );
}
