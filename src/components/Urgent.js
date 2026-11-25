// Urgent quest overlay: pop-up with a rest and a task option, the running timer, the follow-up hour, and results.
import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Modal, Pressable, ScrollView, Text, View } from "react-native";
import Svg, { Circle, Polygon } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  FOLLOW_FAIL_COST, FOLLOW_UPS, URGENT, failCost, followById, followReward, restById, restReward, skipCost, taskById, taskReward,
} from "../game/urgent";
import { acceptUrgent, checkUrgent, chooseFollowUp, dismissUrgent, finishFollowUp, finishUrgent, skipUrgent } from "../lib/urgent";
import { Coins, Frame, Label, SysButton, hexPoints, nativeDriver } from "./sys";
import LevelUp from "./LevelUp";
import CheckIn from "./CheckIn";
import { needsProof } from "../game/proof";
import { useTheme } from "../theme";
import { t } from "../i18n";

const AMBER = "#F6B45A";
const fill = (s, vars) => Object.entries(vars ?? {}).reduce((acc, [k, v]) => acc.split(`{${k}}`).join(String(v)), String(s ?? ""));
const mmss = (ms) => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };

function useNow() {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, []);
  return now;
}

function Reward({ r, size = 18 }) {
  const { color, font } = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
      <Coins value={r.coins} sign="+" size={size} />
      <Text style={{ fontFamily: font.num, fontSize: size, color: color.accent }}>+{r.xp} <Text style={{ fontSize: size * 0.7 }}>{t.status.exp}</Text></Text>
    </View>
  );
}

function TimerHex({ left, total }) {
  const { color, font } = useTheme();
  const c = 2 * Math.PI * 98;
  return (
    <View style={{ width: 220, height: 220, alignSelf: "center", alignItems: "center", justifyContent: "center", marginTop: 24 }}>
      <Svg width={220} height={220} style={{ position: "absolute" }}>
        <Circle cx={110} cy={110} r={98} fill="none" stroke="rgba(159,203,255,0.14)" strokeWidth={3} />
        <Circle cx={110} cy={110} r={98} fill="none" stroke={AMBER} strokeWidth={3} strokeLinecap="round"
          strokeDasharray={`${c}`} strokeDashoffset={c * (1 - Math.max(0, left) / total)} transform="rotate(-90 110 110)" />
        <Polygon points={hexPoints(152, 168).split(" ").map((p) => p.split(",").map(Number)).map(([x, y]) => `${x + 34},${y + 26}`).join(" ")}
          fill="rgba(8,16,32,0.9)" stroke="rgba(207,228,255,0.6)" strokeWidth={1.5} />
      </Svg>
      <Label>{t.urgent.timeLeft}</Label>
      <Text style={{ fontFamily: font.num, fontSize: 44, color: "#FFFFFF", fontVariant: ["tabular-nums"] }}>{mmss(left)}</Text>
    </View>
  );
}

export default function Urgent({ user, player }) {
  const { color, font } = useTheme();
  const insets = useSafeAreaInsets();
  const now = useNow();
  const pulse = useRef(new Animated.Value(0.3)).current;
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null); // { kind: "done" | "skipped", ... }
  const [levelUp, setLevelUp] = useState(null);
  const [check, setCheck] = useState(null); // proof and check-in after a finished urgent quest
  const checking = useRef(false);
  const u = player?.urgent;

  // Check on open, then every minute: offers new urgent quests and closes ones that ran out.
  useEffect(() => {
    const run = () => {
      if (checking.current) return;
      checking.current = true;
      checkUrgent(user.uid).catch(() => {}).finally(() => { checking.current = false; });
    };
    run();
    const id = setInterval(run, 60000);
    return () => clearInterval(id);
  }, [user.uid]);

  // A running timer that hits zero is closed right away.
  const deadline = u?.status === "active" ? u.deadline : u?.status === "followup" ? u.followDeadline : u?.status === "offered" ? u.offeredAt + URGENT.acceptMinutes * 60000 : null;
  const timedOut = deadline && now > deadline;
  useEffect(() => {
    if (timedOut && !checking.current) {
      checking.current = true;
      checkUrgent(user.uid).catch(() => {}).finally(() => { checking.current = false; });
    }
  }, [timedOut, user.uid]);

  const live = u && (["offered", "active", "followup"].includes(u.status) || (u.status === "failed" && !u.seen));
  const visible = !!(live || result || levelUp || check);
  useEffect(() => {
    if (!visible) return;
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: nativeDriver }),
      Animated.timing(pulse, { toValue: 0.3, duration: 700, easing: Easing.inOut(Easing.quad), useNativeDriver: nativeDriver }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [visible, pulse]);
  if (!visible) return null;
  if (check && !live && !result) return <CheckIn uid={user.uid} data={check} onClose={() => setCheck(null)} />;
  if (levelUp && !live && !result) return <LevelUp data={levelUp} onClose={() => setLevelUp(null)} />;

  const act = async (fn, after) => {
    setBusy(true);
    try { const r = await fn(); after?.(r); } catch (e) { /* the next check fixes any stale state */ } finally { setBusy(false); }
  };

  const rest = u?.rest ? restById[u.rest] : null;
  const task = u?.task ? taskById[u.task] : null;
  const showAlert = u && ["offered", "active", "followup"].includes(u.status) && !result;

  let body = null;
  if (result?.kind === "done") {
    body = (
      <View style={{ alignItems: "center", gap: 14, marginTop: 80 }}>
        <Svg width={80} height={88}><Polygon points={hexPoints(80, 88, 2)} fill={color.frame} /></Svg>
        <Label tone={color.hi} style={{ letterSpacing: 5, fontSize: 12 }}>{t.urgent.clear}</Label>
        <Reward r={result} size={28} />
        <SysButton label={t.urgent.ok} onPress={() => {
          setResult(null);
          if (result.levelUp) setLevelUp({ level: result.levelUp, xp: player.xp ?? 0 });
          if (result.logId) setCheck({ logId: result.logId, title: result.title ?? "", proof: needsProof(player, "urgent"), ask: true });
        }} style={{ alignSelf: "stretch", marginTop: 20 }} />
      </View>
    );
  } else if (result?.kind === "skipped") {
    body = (
      <View style={{ alignItems: "center", gap: 12, marginTop: 120 }}>
        <Text style={{ fontFamily: font.body, fontSize: 15, color: "#CAD6EC" }}>{t.urgent.skipped}</Text>
        <Text style={{ fontFamily: font.num, fontSize: 26, color: color.dangerSoft }}>{fill(t.urgent.lost, { n: result.lost })}</Text>
        <SysButton label={t.urgent.ok} onPress={() => setResult(null)} style={{ alignSelf: "stretch", marginTop: 20 }} />
      </View>
    );
  } else if (u?.status === "failed") {
    const title = u.choice === "task" ? task?.title : u.follow ? followById[u.follow]?.title : rest?.title;
    body = (
      <View style={{ alignItems: "center", gap: 12, marginTop: 100 }}>
        <Label tone={color.danger} style={{ letterSpacing: 5, fontSize: 12 }}>{t.urgent.timesUp}</Label>
        <Text style={{ fontFamily: font.body, fontSize: 15, color: "#CAD6EC", textAlign: "center" }}>{fill(t.urgent.notFinished, { title: title ?? "" })}</Text>
        <Text style={{ fontFamily: font.num, fontSize: 30, color: color.danger }}>{fill(t.urgent.lost, { n: u.lost ?? 0 })}</Text>
        <SysButton label={t.urgent.ok} disabled={busy} onPress={() => act(() => dismissUrgent(user.uid))} style={{ alignSelf: "stretch", marginTop: 20 }} />
      </View>
    );
  } else if (u?.status === "offered") {
    const title = u.reason === "idle" ? t.urgent.titleIdle : u.reason === "request" ? t.urgent.titleRequest : t.urgent.titleRandom;
    const opts = [
      { key: "rest", tag: t.urgent.rest, tagC: color.accent, o: rest, r: restReward(rest, task), note: t.urgent.restNote },
      { key: "task", tag: t.urgent.task, tagC: AMBER, o: task, r: taskReward(task), note: t.urgent.taskNote },
    ];
    body = (
      <>
        <View style={{ alignItems: "center", gap: 6, marginTop: 28 }}>
          <Label tone={AMBER} style={{ letterSpacing: 5, fontSize: 12 }}>{t.urgent.label}</Label>
          <Text accessibilityRole="header" style={{ fontFamily: font.bold, fontSize: 26, color: "#FFFFFF", textAlign: "center" }}>{title}</Text>
          <Text style={{ fontFamily: font.body, fontSize: 14, color: color.muted, textAlign: "center" }}>
            {u.reason === "idle" ? fill(t.urgent.subIdle, { h: URGENT.idleHours }) : t.urgent.subOther}
          </Text>
          <Text style={{ marginTop: 6, fontFamily: font.body, fontSize: 12, color: color.muted }}>
            {t.urgent.expires} <Text style={{ fontFamily: font.num, fontSize: 18, color: AMBER }}>{mmss(u.offeredAt + URGENT.acceptMinutes * 60000 - now)}</Text>
          </Text>
        </View>
        <View style={{ gap: 10, marginTop: 22 }}>
          {opts.map(({ key, tag, tagC, o, r, note }) => (
            <Pressable key={key} accessibilityRole="button" disabled={busy} onPress={() => act(() => acceptUrgent(user.uid, key))}>
              <Frame contentStyle={{ padding: 16, gap: 8 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Label tone={tagC}>{tag}</Label>
                  <Text style={{ fontFamily: font.body, fontSize: 12, color: color.muted }}>{fill(t.urgent.timeNote, { min: o.minutes, extra: URGENT.extraMinutes })}</Text>
                </View>
                <Text style={{ fontFamily: font.bold, fontSize: 19, color: "#FFFFFF" }}>{o.title}</Text>
                <Text style={{ fontFamily: font.body, fontSize: 13, lineHeight: 18, color: color.muted }}>{o.how}</Text>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Reward r={r} />
                  <Text style={{ fontFamily: font.bodyBold, fontSize: 11, color: color.muted }}>{note}</Text>
                </View>
              </Frame>
            </Pressable>
          ))}
        </View>
        <Pressable accessibilityRole="button" disabled={busy} onPress={() => act(() => skipUrgent(user.uid), (r) => r && setResult({ kind: "skipped", lost: r.lost }))}
          style={{ minHeight: 44, alignItems: "center", justifyContent: "center", marginTop: 10 }}>
          <Text style={{ fontFamily: font.bodyBold, fontSize: 14, color: color.muted }}>{fill(t.urgent.skip, { n: skipCost(task) })}</Text>
        </Pressable>
        <Text style={{ marginTop: 14, fontFamily: font.body, fontSize: 12, lineHeight: 17, color: "#6F83A8", textAlign: "center" }}>{t.urgent.rule}</Text>
      </>
    );
  } else if (u?.status === "active") {
    const o = u.choice === "rest" ? rest : task;
    const r = u.choice === "rest" ? restReward(rest, task) : taskReward(task);
    const total = (o.minutes + URGENT.extraMinutes) * 60000;
    body = (
      <>
        <View style={{ alignItems: "center", gap: 6, marginTop: 28 }}>
          <Label tone={AMBER} style={{ letterSpacing: 4, fontSize: 12 }}>{t.urgent.accepted}</Label>
          <Text accessibilityRole="header" style={{ fontFamily: font.bold, fontSize: 26, color: "#FFFFFF", textAlign: "center" }}>{o.title}</Text>
          <Text style={{ fontFamily: font.body, fontSize: 14, color: color.muted, textAlign: "center" }}>{o.how}</Text>
        </View>
        <TimerHex left={u.deadline - now} total={total} />
        <Text style={{ marginTop: 18, fontFamily: font.body, fontSize: 13, color: color.muted, textAlign: "center" }}>
          {fill(t.urgent.missNote, { extra: URGENT.extraMinutes, n: failCost(r) })}
        </Text>
        <SysButton label={t.urgent.done} disabled={busy} style={{ marginTop: 28 }}
          onPress={() => act(() => finishUrgent(user.uid), (res) => { if (res && !res.followUp) setResult({ kind: "done", ...res }); })} />
      </>
    );
  } else if (u?.status === "followup") {
    const chosen = u.follow ? followById[u.follow] : null;
    body = (
      <>
        <View style={{ alignItems: "center", gap: 6, marginTop: 28 }}>
          <Label tone={AMBER} style={{ letterSpacing: 5, fontSize: 12 }}>{t.urgent.label}</Label>
          <Text accessibilityRole="header" style={{ fontFamily: font.bold, fontSize: 26, color: "#FFFFFF", textAlign: "center" }}>{t.urgent.followTitle}</Text>
          <Text style={{ fontFamily: font.body, fontSize: 14, color: color.muted, textAlign: "center" }}>{chosen ? t.urgent.followChosen : t.urgent.followSub}</Text>
          <Text style={{ marginTop: 6, fontFamily: font.num, fontSize: 30, color: AMBER, fontVariant: ["tabular-nums"] }}>{mmss(u.followDeadline - now)}</Text>
        </View>
        {chosen ? (
          <>
            <Frame style={{ marginTop: 20 }} contentStyle={{ padding: 16, gap: 10 }}>
              <Text style={{ fontFamily: font.bold, fontSize: 19, color: "#FFFFFF" }}>{chosen.title}</Text>
              <Reward r={followReward(chosen)} />
              <Text style={{ fontFamily: font.body, fontSize: 12, color: color.muted }}>{fill(t.urgent.followMiss, { n: FOLLOW_FAIL_COST })}</Text>
            </Frame>
            <SysButton label={t.urgent.done} disabled={busy} style={{ marginTop: 16 }}
              onPress={() => act(() => finishFollowUp(user.uid), (res) => res && setResult({ kind: "done", ...res }))} />
          </>
        ) : (
          <Frame style={{ marginTop: 20 }}>
            {FOLLOW_UPS.map((f, i) => (
              <Pressable key={f.id} accessibilityRole="button" disabled={busy} onPress={() => act(() => chooseFollowUp(user.uid, f.id))}
                style={{ minHeight: 56, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, borderBottomWidth: i === FOLLOW_UPS.length - 1 ? 0 : 1, borderBottomColor: color.line }}>
                <Text style={{ fontFamily: font.bold, fontSize: 15, color: "#FFFFFF" }}>{f.title}</Text>
                <Reward r={followReward(f)} size={15} />
              </Pressable>
            ))}
          </Frame>
        )}
      </>
    );
  }

  return (
    <Modal transparent animationType="fade" visible onRequestClose={() => {}}>
      <View style={{ flex: 1, backgroundColor: "rgba(1,4,10,0.97)" }}>
        {showAlert ? (
          <Animated.View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, borderWidth: 2, borderColor: AMBER, opacity: pulse }} />
        ) : null}
        <ScrollView contentContainerStyle={{ paddingTop: insets.top + 18, paddingBottom: insets.bottom + 30, paddingHorizontal: 16, maxWidth: 520, width: "100%", alignSelf: "center" }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Label tone={color.hi} style={{ letterSpacing: 5, fontSize: 12 }}>{t.status.system}</Label>
            <Coins value={player.coins ?? 0} size={18} />
          </View>
          {body}
        </ScrollView>
      </View>
    </Modal>
  );
}
