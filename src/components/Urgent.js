// Sub-scenarios (urgent quests), scenario style: a small notice above the tab bar, never the whole screen.
// Tap it to read the scenario; accept only if you want to. Wave it away for free. While one runs, a small bar
// with the timer stays in reach.
import { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { DIFF_LETTER, URGENT, taskById, taskReward } from "../game/urgent";
import { acceptUrgent, checkUrgent, finishUrgent, passUrgent } from "../lib/urgent";
import { showSystem } from "../lib/popup";
import { doneFeel, tapFeel } from "../lib/haptics";
import { MsgBox, Typed, bracket } from "./Scenario";
import LevelUp from "./LevelUp";
import CheckIn from "./CheckIn";
import { needsProof } from "../game/proof";
import { useTheme } from "../theme";
import { t } from "../i18n";

const fill = (s, vars) => Object.entries(vars ?? {}).reduce((acc, [k, v]) => acc.split(`{${k}}`).join(String(v)), String(s ?? ""));
const mmss = (ms) => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };

function useNow(on) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!on) return undefined;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [on]);
  return now;
}

// One "Key: value" row of the scenario window.
function Row({ k, v, tone }) {
  const { color, font } = useTheme();
  return (
    <Text style={{ fontFamily: font.body, fontSize: 13, lineHeight: 19, color: color.text }}>
      <Text style={{ fontFamily: font.bodyBold, color: tone ?? color.muted }}>{`${k}: `}</Text>{v}
    </Text>
  );
}

function Btn({ label, onPress, disabled, strong }) {
  const { color, font } = useTheme();
  return (
    <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress}
      style={({ pressed }) => ({ flex: 1, minHeight: 46, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: strong ? color.accent : "rgba(255,255,255,0.3)",
        backgroundColor: pressed ? "rgba(255,255,255,0.14)" : strong ? "rgba(255,255,255,0.06)" : "transparent", opacity: disabled ? 0.5 : 1 })}>
      <Text style={{ fontFamily: font.bold, fontSize: 13, letterSpacing: 2, color: "#FFFFFF" }}>{label}</Text>
    </Pressable>
  );
}

export default function Urgent({ user, player }) {
  const { color, font } = useTheme();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [levelUp, setLevelUp] = useState(null);
  const [check, setCheck] = useState(null); // proof and check-in after a finished one
  const checking = useRef(false);
  const u = player?.urgent;
  const task = u ? taskById(u.task) : null;
  const live = !!task && (u.status === "offered" || u.status === "active");
  const now = useNow(live);

  // Check on open, then every minute: offers new ones (only at home) and closes ones that ran out.
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

  const deadline = u?.status === "active" ? u.deadline : u?.status === "offered" ? u.offeredAt + URGENT.acceptMinutes * 60000 : null;
  const timedOut = live && deadline && now > deadline;
  useEffect(() => {
    if (timedOut && !checking.current) {
      checking.current = true;
      checkUrgent(user.uid).catch(() => {}).finally(() => { checking.current = false; });
    }
  }, [timedOut, user.uid]);

  if (check) return <CheckIn uid={user.uid} data={check} onClose={() => setCheck(null)} />;
  if (levelUp) return <LevelUp data={levelUp} onClose={() => setLevelUp(null)} />;
  if (!live || timedOut) return null;

  const act = async (fn, after) => {
    setBusy(true);
    try { const r = await fn(); after?.(r); } catch { /* the next check fixes any stale state */ } finally { setBusy(false); }
  };
  const r = taskReward(task);
  const active = u.status === "active";
  const left = deadline - now;

  // Folded: one line above the tab bar. Tap to open, ✕ to pass (free).
  if (!open) {
    return (
      <View pointerEvents="box-none" style={{ position: "absolute", left: 0, right: 0, bottom: 10, alignItems: "center", zIndex: 40 }}>
        <View style={{ width: "92%", maxWidth: 440, flexDirection: "row", alignItems: "stretch", borderWidth: 1, borderColor: "rgba(255,255,255,0.28)", backgroundColor: "rgba(0,0,0,0.92)" }}>
          <View style={{ width: 3, backgroundColor: color.accent }} />
          <Pressable accessibilityRole="button" accessibilityLabel={`${active ? t.urgent.running : t.urgent.arrived}. ${task.title}`} onPress={() => { tapFeel(); setOpen(true); }}
            style={{ flex: 1, minHeight: 52, justifyContent: "center", paddingHorizontal: 12, gap: 2 }}>
            <Typed key={u.status} text={bracket(active ? t.urgent.running : t.urgent.arrived)} style={{ fontFamily: font.bold, fontSize: 13, color: "#FFFFFF" }} />
            <Text numberOfLines={1} style={{ fontFamily: font.body, fontSize: 12, color: color.text }}>
              {task.title}<Text style={{ color: color.muted }}>{`  ·  ${mmss(left)}`}</Text>
            </Text>
          </Pressable>
          {!active ? (
            <Pressable accessibilityRole="button" accessibilityLabel={t.urgent.pass} disabled={busy} onPress={() => act(() => passUrgent(user.uid))} hitSlop={6}
              style={{ width: 48, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ fontFamily: font.bold, fontSize: 18, color: color.muted }}>✕</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    );
  }

  // Open: the scenario window, still only part of the screen.
  const reasonLine = u.reason === "idle" ? fill(t.urgent.reasonIdle, { h: URGENT.idleHours }) : u.reason === "request" ? t.urgent.reasonRequest : t.urgent.reasonRandom;
  return (
    <View pointerEvents="box-none" style={{ position: "absolute", left: 0, right: 0, bottom: 10, alignItems: "center", zIndex: 40 }}>
      <View style={{ width: "92%", maxWidth: 440, maxHeight: 460, gap: 4 }}>
        <ScrollView contentContainerStyle={{ gap: 4 }}>
          <MsgBox text={bracket(active ? t.urgent.running : t.urgent.arrived)} tone={color.accent} strong />
          <MsgBox tone={color.accent} delay={160} align="left" typed={false}>
            <View style={{ gap: 3 }}>
              <Text style={{ fontFamily: font.bold, fontSize: 15, color: "#FFFFFF", marginBottom: 4 }}>{fill(t.urgent.heading, { n: player.urgentToday?.count ?? 1, title: task.title })}</Text>
              <Row k={t.urgent.category} v={t.urgent.sub} />
              <Row k={t.urgent.difficulty} v={DIFF_LETTER[task.difficulty] ?? "E"} />
              <Row k={t.urgent.condition} v={`${task.title}. ${task.how}`} />
              <Row k={t.urgent.limit} v={active ? fill(t.urgent.leftNow, { t: mmss(left) }) : fill(t.urgent.minutes, { n: task.minutes + URGENT.extraMinutes })} tone={active ? color.accent : null} />
              <Row k={t.urgent.reward} v={fill(t.urgent.rewardText, { c: r.coins, x: r.xp })} tone={color.gold} />
              <Row k={t.urgent.failure} v={t.urgent.noFailure} />
            </View>
          </MsgBox>
          {!active ? <MsgBox text={bracket(reasonLine)} tone={color.accent} delay={320} /> : null}
          <View style={{ flexDirection: "row", gap: 6, marginTop: 2 }}>
            {active ? (
              <>
                <Btn label={t.urgent.giveUp} disabled={busy} onPress={() => act(() => passUrgent(user.uid), () => setOpen(false))} />
                <Btn label={t.urgent.done} strong disabled={busy} onPress={() => act(() => finishUrgent(user.uid), (res) => {
                  if (!res) return;
                  setOpen(false);
                  doneFeel();
                  showSystem({ title: t.urgent.cleared, lines: [fill(t.urgent.paid, { c: res.coins, x: res.xp })], tone: "buff" });
                  if (res.levelUp) setLevelUp({ level: res.levelUp, xp: player.xp ?? 0 });
                  else if (res.logId) setCheck({ logId: res.logId, title: res.title ?? "", proof: needsProof(player, "urgent"), ask: true });
                })} />
              </>
            ) : (
              <>
                <Btn label={t.urgent.pass} disabled={busy} onPress={() => act(() => passUrgent(user.uid))} />
                <Btn label={t.urgent.accept} strong disabled={busy} onPress={() => act(() => acceptUrgent(user.uid))} />
              </>
            )}
          </View>
          <Pressable accessibilityRole="button" onPress={() => setOpen(false)} style={{ minHeight: 40, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontFamily: font.bodyBold, fontSize: 12, color: color.muted }}>{t.urgent.fold}</Text>
          </Pressable>
        </ScrollView>
      </View>
    </View>
  );
}
