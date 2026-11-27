// Settings tab: profile, Tune the System (questionnaire), quotes, the System settings, reminders, quest history and the account.
import { TONES, VOICE_MAX_LINES, ownLines, voiceTone } from "../game/voice";
import { useEffect, useRef, useState } from "react";
import { Image, Modal, Platform, Pressable, ScrollView, Switch, Text, TextInput, View } from "react-native";
import * as Updates from "expo-updates";
import { signOut } from "firebase/auth";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { auth } from "../lib/firebase";
import { setDifficulty, setSimple, setVoice, setFeelSetting, setMorning, setNotify, setPrivacy, setProof, setReminders } from "../lib/player";
import { difficultyOf } from "../game/difficulty";
import { hhmm } from "../game/schedule";
import { changeName } from "../lib/shop";
import { isTester, testerFill, testerReset } from "../lib/tester";
import { NAME_CHANGE_PRICE } from "../game/shop";
import { setFeel, doneFeel } from "../lib/haptics";
import { SavedStamp, useSavedStamp, useTrack } from "./saved";
import { PRIVACY_KEYS, privacySettings } from "../game/social";
import { loadProof } from "../lib/proof";
import { PROOF_KINDS, proofSettings } from "../game/proof";
import { askNotifyPermission, notifyPermission, notifySupported } from "../lib/notify";
import { NOTIFY_KINDS, notifySettings } from "../game/notify";
import { HARD_DAYS, HARD_EXIT_MIN, HARD_EXIT_PER_DAY, HARD_MAX_DAYS, hardDaysLeft, hardExitPrice, isHard } from "../game/hard";
import { leaveHard, startHard } from "../lib/hard";
import { askLocation, savePlace, setLocationOn } from "../lib/location";
import { calendarPermission, listCalendars, setCalendarOn } from "../lib/calendar";
import { setUrgentPerDay } from "../lib/urgent";
import { scheduleSeverity } from "../lib/penalty";
import { useHistory } from "../lib/history";
import { urgentPerDayOf } from "../game/urgent";
import { severityFor } from "../game/penalty";
import { todayKey } from "../game/quests";
import { Coins, Frame, Glow, Label, SysButton } from "./sys";
import { Button } from "./ui";
import { DifficultyChips, SeverityChips, UrgentChips } from "./systemChoices";
import Tune from "./Tune";
import { useTheme } from "../theme";
import { t } from "../i18n";
import { Glossary } from "./Explain";
import { FeedbackSheet } from "./Feedback";
import GymSetup from "./GymSetup";
import Schedule from "./Schedule";
import { TEMPLATES } from "../game/gym";
import { parseTime } from "../game/reminders";
import { askWebNotifications } from "../lib/reminders";
import { FULL_MORNING, FULL_MORNING_COINS, FULL_MORNING_XP, MORNING_DEFAULT, MORNING_ITEMS, MORNING_MAX, hasFullMorning } from "../game/morning";
import { deleteAccount } from "../lib/account";

const fill = (s, vars) => Object.entries(vars ?? {}).reduce((acc, [k, v]) => acc.split(`{${k}}`).join(String(v)), String(s ?? ""));

function Input({ label, value, onChangeText, keyboardType, width, maxLength }) {
  const { color, font } = useTheme();
  return (
    <View style={{ gap: 6, width }}>
      <Text style={{ fontFamily: font.bodyBold, fontSize: 12, color: color.muted }}>{label}</Text>
      <TextInput value={value} onChangeText={onChangeText} keyboardType={keyboardType} accessibilityLabel={label} maxLength={maxLength}
        placeholderTextColor={color.muted}
        style={{ minHeight: 46, paddingHorizontal: 12, fontFamily: font.bodyMedium, fontSize: 16, color: "#FFFFFF", borderWidth: 1, borderColor: "rgba(159,203,255,0.3)", backgroundColor: "rgba(5,10,24,0.7)" }} />
    </View>
  );
}

// A settings group. With onToggle it folds: only its title shows until you open it (one open at a time).
// A small heading over a group of settings.
function GroupLabel({ text }) {
  const { color, font } = useTheme();
  return <Text style={{ marginTop: 22, marginBottom: 2, paddingHorizontal: 4, fontFamily: font.bold, fontSize: 11, letterSpacing: 3, color: color.muted }}>{text}</Text>;
}

function Section({ title, sub, children, open = true, onToggle, onLayout }) {
  const { color, font } = useTheme();
  const head = (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      <View style={{ flex: 1, gap: 4 }}>
        <Label tone={color.hi}>{String(title ?? "").toUpperCase()}</Label>
        {sub && (open || !onToggle) ? <Text style={{ fontFamily: font.body, fontSize: 13, lineHeight: 18, color: color.muted }}>{sub}</Text> : null}
      </View>
      {onToggle ? <Text style={{ fontFamily: font.bold, fontSize: 18, color: color.muted, transform: [{ rotate: open ? "90deg" : "0deg" }] }}>›</Text> : null}
    </View>
  );
  return (
    <View onLayout={onLayout}>
    <Frame cut={14} style={{ marginTop: onToggle ? 6 : 14 }} contentStyle={{ padding: onToggle && !open ? 13 : 16, gap: 12 }}>
      {onToggle ? (
        <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={onToggle} style={{ minHeight: 28, justifyContent: "center" }}>{head}</Pressable>
      ) : head}
      {open ? children : null}
    </Frame>
    </View>
  );
}

// Hard mode: pick how many days, then you're locked in. Leaving early costs coins or a streak shield.
function HardMode({ user, player }) {
  const { color, font } = useTheme();
  const [days, setDays] = useState(7);
  const [sure, setSure] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const on = isHard(player);
  const left = hardDaysLeft(player);
  const price = hardExitPrice(player);
  const until = on ? new Date(player.hard.until) : null;
  async function go(fn) {
    setBusy(true);
    setMsg(null);
    try { await fn(); doneFeel(); setSure(false); }
    catch (e) { setMsg(e.message === "no-coins" ? fill(t.hard.noCoins, { n: price }) : e.message === "no-shield" ? t.hard.noShield : t.shop.failed); }
    finally { setBusy(false); }
  }
  if (on) {
    return (
      <View style={{ gap: 10 }}>
        <Text style={{ fontFamily: font.bold, fontSize: 18, color: "#FFFFFF" }}>{fill(left === 1 ? t.hard.leftOne : t.hard.left, { n: left })}</Text>
        <Text style={{ fontFamily: font.body, fontSize: 13, lineHeight: 18, color: color.muted }}>{fill(t.hard.until, { date: until.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" }), time: hhmm(until.getHours() + until.getMinutes() / 60) })}</Text>
        <Text style={{ fontFamily: font.body, fontSize: 13, lineHeight: 18, color: color.text }}>{t.hard.locks}</Text>
        <SysButton label={fill(t.hard.leaveCoins, { n: price })} onPress={() => go(() => leaveHard(user.uid, "coins", t.hard.logTitle))} disabled={busy} />
        {(player.shields ?? 0) > 0 ? <SysButton label={t.hard.leaveShield} onPress={() => go(() => leaveHard(user.uid, "shield", t.hard.logTitle))} disabled={busy} /> : null}
        {msg ? <Text style={{ fontFamily: font.bodyMedium, fontSize: 13, color: "#F6B45A" }}>{msg}</Text> : null}
      </View>
    );
  }
  return (
    <View style={{ gap: 10 }}>
      <Text style={{ fontFamily: font.body, fontSize: 13, lineHeight: 18, color: color.text }}>{t.hard.what}</Text>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text style={{ fontFamily: font.bodyMedium, fontSize: 14, color: color.text }}>{t.hard.howLong}</Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          {[["−", -1], ["+", 1]].map(([label, d]) => (
            <Pressable key={label} accessibilityRole="button" accessibilityLabel={`${t.hard.howLong} ${label}`} onPress={() => { setSure(false); setDays((n) => Math.min(HARD_MAX_DAYS, Math.max(1, n + d))); }}
              style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(159,203,255,0.3)" }}>
              <Text style={{ fontFamily: font.num, fontSize: 20, color: color.hi }}>{label}</Text>
            </Pressable>
          ))}
        </View>
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
        {HARD_DAYS.map((n) => (
          <Pressable key={n} accessibilityRole="button" accessibilityState={{ selected: days === n }} onPress={() => { setSure(false); setDays(n); }}
            style={{ minHeight: 40, paddingHorizontal: 12, justifyContent: "center", borderWidth: 1, borderColor: days === n ? color.frame : "rgba(159,203,255,0.22)", backgroundColor: days === n ? "rgba(159,203,255,0.16)" : "transparent" }}>
            <Text style={{ fontFamily: font.bold, fontSize: 13, color: days === n ? "#FFFFFF" : color.muted }}>{fill(t.hard.days, { n })}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={{ fontFamily: font.num, fontSize: 28, color: "#FFFFFF", textAlign: "center" }}>{fill(days === 1 ? t.hard.oneDay : t.hard.days, { n: days })}</Text>
      {sure ? <Text style={{ fontFamily: font.bodyBold, fontSize: 13, lineHeight: 18, color: "#F6B45A" }}>{fill(t.hard.sure, { n: Math.max(HARD_EXIT_MIN, days * HARD_EXIT_PER_DAY) })}</Text> : null}
      <SysButton label={sure ? t.hard.confirm : fill(t.hard.start, { n: days })} onPress={() => (sure ? go(() => startHard(user.uid, days)) : setSure(true))} disabled={busy} />
      {msg ? <Text style={{ fontFamily: font.bodyMedium, fontSize: 13, color: "#F6B45A" }}>{msg}</Text> : null}
    </View>
  );
}

// Agenda: your iPhone Calendar (read only). Pick which calendars count.
function Agenda({ user, player }) {
  const { color, font } = useTheme();
  const [msg, setMsg] = useState(null);
  const [cals, setCals] = useState(null);
  const on = !!player.calendarOn;
  const picked = player.calendarIds ?? [];
  useEffect(() => {
    if (!on) return;
    listCalendars().then(setCals).catch(() => setCals([]));
  }, [on]);
  async function toggle(v) {
    setMsg(null);
    if (!v) return setCalendarOn(user.uid, false).catch(() => {});
    const p = await calendarPermission(true);
    if (p === "granted") await setCalendarOn(user.uid, true).catch(() => {});
    else setMsg(p === "unavailable" ? (Platform.OS === "web" ? t.agenda.web : t.agenda.unavailable) : t.agenda.denied);
  }
  const pick = (id) => {
    const next = picked.includes(id) ? picked.filter((x) => x !== id) : [...picked, id];
    setCalendarOn(user.uid, true, next).catch(() => {});
  };
  return (
    <View style={{ gap: 10 }}>
      <View style={{ minHeight: 48, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <Text style={{ flex: 1, fontFamily: font.bodyMedium, fontSize: 14, color: color.text }}>{t.agenda.toggle}</Text>
        <Switch accessibilityLabel={t.agenda.toggle} value={on} onValueChange={toggle}
          trackColor={{ false: "#1A2440", true: color.blue }} thumbColor="#EAF4FF" ios_backgroundColor="#1A2440" />
      </View>
      {on && cals?.length ? (
        <View style={{ gap: 6 }}>
          <Text style={{ fontFamily: font.body, fontSize: 12, color: color.muted }}>{t.agenda.pick}</Text>
          {cals.map((c) => {
            const sel = picked.length === 0 || picked.includes(c.id);
            return (
              <Pressable key={c.id} accessibilityRole="checkbox" accessibilityState={{ checked: sel }} onPress={() => pick(c.id)} style={{ minHeight: 40, flexDirection: "row", alignItems: "center", gap: 10 }}>
                <View style={{ width: 18, height: 18, borderWidth: 1, borderColor: color.frame, backgroundColor: sel ? (c.color ?? color.blue) : "transparent" }} />
                <Text style={{ flex: 1, fontFamily: font.body, fontSize: 14, color: color.text }}>{c.title}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
      <Text style={{ fontFamily: font.body, fontSize: 12, lineHeight: 17, color: color.muted }}>{t.agenda.privacy}</Text>
      {msg ? <Text style={{ fontFamily: font.bodyMedium, fontSize: 13, color: "#F6B45A" }}>{msg}</Text> : null}
    </View>
  );
}

// Places: location on or off, and the places you save yourself (home, school or work).
function Places({ user, player }) {
  const { color, font } = useTheme();
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const on = !!player.locationOn;
  async function toggle(v) {
    setMsg(null);
    if (!v) return setLocationOn(user.uid, false).catch(() => {});
    const p = await askLocation();
    if (p === "granted") await setLocationOn(user.uid, true).catch(() => {});
    else setMsg(p === "unavailable" ? t.fit.unavailable : t.fit.denied);
  }
  async function save(which) {
    setBusy(true);
    setMsg(null);
    try { await savePlace(user.uid, which); doneFeel(); setMsg(fill(t.places.saved, { place: t.places[which] })); }
    catch { setMsg(t.places.failed); }
    finally { setBusy(false); }
  }
  return (
    <View style={{ gap: 10 }}>
      <View style={{ minHeight: 48, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <Text style={{ flex: 1, fontFamily: font.bodyMedium, fontSize: 14, color: color.text }}>{t.places.toggle}</Text>
        <Switch accessibilityLabel={t.places.toggle} value={on} onValueChange={toggle}
          trackColor={{ false: "#1A2440", true: color.blue }} thumbColor="#EAF4FF" ios_backgroundColor="#1A2440" />
      </View>
      {on ? (
        <>
          {["home", "school"].map((w) => (
            <View key={w} style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Text style={{ flex: 1, fontFamily: font.body, fontSize: 13, color: player.places?.[w] ? color.text : color.muted }}>
                {player.places?.[w] ? fill(t.places.set, { place: t.places[w] }) : fill(t.places.notSet, { place: t.places[w] })}
              </Text>
              <Pressable accessibilityRole="button" disabled={busy} onPress={() => save(w)}
                style={({ pressed }) => ({ minHeight: 40, paddingHorizontal: 12, justifyContent: "center", borderWidth: 1, borderColor: "rgba(159,203,255,0.3)", backgroundColor: pressed ? "rgba(159,203,255,0.15)" : "transparent" })}>
                <Text style={{ fontFamily: font.bodyBold, fontSize: 12, color: color.text }}>{t.places.here}</Text>
              </Pressable>
            </View>
          ))}
        </>
      ) : null}
      <Text style={{ fontFamily: font.body, fontSize: 12, lineHeight: 17, color: color.muted }}>{t.places.privacy}</Text>
      {msg ? <Text style={{ fontFamily: font.bodyMedium, fontSize: 13, color: color.accent }}>{msg}</Text> : null}
    </View>
  );
}

// Voice: how notifications talk to you. Pick a tone, or write your own lines.
function Voice({ user, player }) {
  const track = useTrack();
  const { color, font } = useTheme();
  const [text, setText] = useState("");
  const tone = voiceTone(player);
  const lines = ownLines(player);
  const save = (patch) => track(setVoice(user.uid, { tone, lines, ...patch })).catch(() => {});
  const add = () => {
    const v = text.trim();
    if (!v) return;
    setText("");
    save({ tone: "mine", lines: [...lines, v.slice(0, 140)].slice(-VOICE_MAX_LINES) });
  };
  const example = tone === "mine" ? lines[lines.length - 1] : tone === "stoic" ? null : t.notify.voices[tone][0];
  return (
    <View style={{ gap: 10, marginTop: 6 }}>
      <Label>{t.notify.voice}</Label>
      <Text style={{ fontFamily: font.body, fontSize: 12, lineHeight: 17, color: color.muted }}>{t.notify.voiceSub}</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
        {TONES.map((x) => (
          <Pressable key={x} accessibilityRole="button" accessibilityState={{ selected: tone === x }} onPress={() => save({ tone: x })}
            style={{ minHeight: 40, paddingHorizontal: 12, justifyContent: "center", borderWidth: 1, borderColor: tone === x ? color.frame : "rgba(159,203,255,0.25)", backgroundColor: tone === x ? "rgba(159,203,255,0.14)" : "transparent" }}>
            <Text style={{ fontFamily: font.bodyBold, fontSize: 13, color: tone === x ? "#FFFFFF" : color.muted }}>{t.notify.tones[x]}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={{ fontFamily: font.body, fontSize: 12, lineHeight: 17, color: color.muted }}>{t.notify.toneHint[tone]}</Text>
      {example ? (
        <View style={{ borderLeftWidth: 2, borderLeftColor: color.accent, paddingLeft: 10, gap: 2 }}>
          <Text style={{ fontFamily: font.bodyBold, fontSize: 11, letterSpacing: 2, color: color.muted }}>{t.notify.example.toUpperCase()}</Text>
          <Text style={{ fontFamily: font.bodyMedium, fontSize: 14, lineHeight: 20, color: color.text }}>{example}</Text>
        </View>
      ) : null}
      {tone === "mine" ? (
        <View style={{ gap: 6 }}>
          {!lines.length ? <Text style={{ fontFamily: font.body, fontSize: 12, color: color.muted }}>{t.notify.noLines}</Text> : null}
          {lines.map((l, i) => (
            <Pressable key={`${i}-${l}`} accessibilityRole="button" accessibilityHint={t.notify.removeLine} onLongPress={() => save({ lines: lines.filter((_, j) => j !== i) })}
              style={{ paddingVertical: 8, borderTopWidth: 1, borderTopColor: color.line }}>
              <Text style={{ fontFamily: font.body, fontSize: 14, lineHeight: 20, color: color.text }}>{l}</Text>
            </Pressable>
          ))}
          <View style={{ flexDirection: "row", gap: 8 }}>
            <TextInput value={text} onChangeText={setText} onSubmitEditing={add} placeholder={t.notify.linePh} placeholderTextColor="#5A6A8A" maxLength={140} accessibilityLabel={t.notify.linePh}
              style={{ flex: 1, minHeight: 44, paddingHorizontal: 10, fontFamily: font.body, fontSize: 14, color: "#FFFFFF", borderWidth: 1, borderColor: "rgba(159,203,255,0.3)", backgroundColor: "rgba(5,10,24,0.7)" }} />
            <Pressable accessibilityRole="button" onPress={add} disabled={!text.trim()} style={{ minHeight: 44, paddingHorizontal: 14, justifyContent: "center", borderWidth: 1, borderColor: color.frame, opacity: text.trim() ? 1 : 0.4 }}>
              <Text style={{ fontFamily: font.bodyBold, fontSize: 13, color: "#FFFFFF" }}>{t.notify.addLine}</Text>
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );
}

function Notifications({ user, player }) {
  const track = useTrack();
  const { color, font } = useTheme();
  const [perm, setPerm] = useState(null);
  useEffect(() => {
    let alive = true;
    notifyPermission().then((p) => { if (alive) setPerm(p); }).catch(() => {});
    return () => { alive = false; };
  }, []);
  if (!notifySupported) return <Text style={{ fontFamily: font.body, fontSize: 13, color: color.muted }}>{t.notify.web}</Text>;
  const on = notifySettings(player);
  const hard = isHard(player);
  return (
    <View style={{ gap: 4 }}>
      {hard ? <Text style={{ fontFamily: font.bodyBold, fontSize: 13, lineHeight: 18, color: color.accent }}>{t.hard.notifyLocked}</Text> : null}
      {perm === "granted" ? <Text style={{ fontFamily: font.body, fontSize: 13, color: color.accent }}>{t.notify.allowed}</Text> : null}
      {perm === "denied" ? <Text style={{ fontFamily: font.body, fontSize: 13, lineHeight: 18, color: color.dangerSoft }}>{t.notify.denied}</Text> : null}
      {perm === "undetermined" ? <SysButton label={t.notify.ask} onPress={async () => setPerm(await askNotifyPermission())} /> : null}
      {NOTIFY_KINDS.map((k) => (
        <View key={k} style={{ minHeight: 48, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: color.line }}>
          <Text style={{ fontFamily: font.bodyMedium, fontSize: 14, color: color.text }}>{t.notify.kinds[k]}</Text>
          <Switch accessibilityLabel={t.notify.kinds[k]} value={on[k]} disabled={hard} onValueChange={(v) => track(setNotify(user.uid, k, v)).catch(() => {})}
            trackColor={{ false: "#1A2440", true: color.blue }} thumbColor="#EAF4FF" ios_backgroundColor="#1A2440" />
        </View>
      ))}
    </View>
  );
}

function Reminders({ user, player }) {
  const track = useTrack();
  const { color, font } = useTheme();
  const [text, setText] = useState("");
  const [time, setTime] = useState("");
  const [daily, setDaily] = useState(true);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(null);
  const list = player.reminders ?? [];
  const shown = list.filter((r) => r.repeat === "daily" || r.date >= todayKey()); // past one-off reminders are hidden

  async function add() {
    const hhmm = parseTime(time);
    if (!hhmm) { setError(t.reminders.badTime); return; }
    const [hh, mm] = hhmm.split(":").map(Number);
    // A one-off reminder is for today, or tomorrow when the time has already passed.
    const now = new Date();
    const when = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hh, mm);
    if (when <= now) when.setDate(when.getDate() + 1);
    const r = { id: String(Date.now()), text: text.trim(), time: hhmm, repeat: daily ? "daily" : "once", ...(daily ? {} : { date: todayKey(when) }) };
    setError(null);
    askWebNotifications();
    try {
      await track(setReminders(user.uid, [...list.filter((x) => x.repeat === "daily" || x.date >= todayKey()), r]));
      setText("");
      setTime("");
      setSaved(fill(r.repeat === "daily" ? t.reminders.savedDaily : t.reminders.savedOnce, { time: hhmm, day: r.date === todayKey() ? t.reminders.today : t.reminders.tomorrow }));
    } catch {
      setError(t.reminders.failed);
    }
  }

  return (
    <View style={{ gap: 10 }}>
      {shown.length ? shown.map((r) => (
        <View key={r.id} style={{ minHeight: 48, flexDirection: "row", alignItems: "center", gap: 12, borderTopWidth: 1, borderTopColor: color.line }}>
          <Text style={{ width: 52, fontFamily: font.num, fontSize: 17, color: color.accent }}>{r.time}</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: font.bodyMedium, fontSize: 14, color: color.text }}>{r.text}</Text>
            <Text style={{ fontFamily: font.body, fontSize: 12, color: color.muted }}>{r.repeat === "daily" ? t.reminders.daily : r.date === todayKey() ? t.reminders.today : t.reminders.tomorrow}</Text>
          </View>
          <Pressable accessibilityRole="button" disabled={isHard(player)} accessibilityLabel={`${t.reminders.remove}: ${r.text}`} onPress={() => track(setReminders(user.uid, list.filter((x) => x.id !== r.id))).catch(() => {})}
            style={{ minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontFamily: font.bodyBold, fontSize: 13, color: color.muted }}>{t.reminders.remove}</Text>
          </Pressable>
        </View>
      )) : <Text style={{ fontFamily: font.body, fontSize: 13, color: color.muted }}>{t.reminders.empty}</Text>}
      <Input label={t.reminders.what} value={text} onChangeText={setText} />
      <View style={{ flexDirection: "row", gap: 8, alignItems: "flex-end" }}>
        <Input label={t.reminders.time} value={time} onChangeText={(v) => { setTime(v); setError(null); setSaved(null); }} keyboardType="numbers-and-punctuation" width={120} />
        <View style={{ flex: 1, flexDirection: "row", gap: 6 }}>
          {[[true, t.reminders.daily], [false, t.reminders.once]].map(([v, label]) => (
            <Pressable key={label} accessibilityRole="button" accessibilityState={{ selected: daily === v }} onPress={() => setDaily(v)}
              style={{ flex: 1, minHeight: 46, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: daily === v ? color.frame : "rgba(159,203,255,0.22)", backgroundColor: daily === v ? "rgba(159,203,255,0.16)" : "transparent" }}>
              <Text style={{ fontFamily: font.bold, fontSize: 13, color: daily === v ? "#FFFFFF" : color.muted }}>{label}</Text>
            </Pressable>
          ))}
        </View>
      </View>
      {error ? <Text style={{ fontFamily: font.bodyMedium, fontSize: 13, color: color.dangerSoft }}>{error}</Text> : null}
      {saved ? <Text style={{ fontFamily: font.bodyMedium, fontSize: 13, color: color.accent }}>{saved}</Text> : null}
      <SysButton label={t.reminders.add} onPress={add} disabled={!text.trim() || !time.trim()} />
      <Text style={{ fontFamily: font.body, fontSize: 12, lineHeight: 17, color: color.muted }}>{Platform.OS === "web" ? t.reminders.howWeb : t.reminders.howApp}</Text>
    </View>
  );
}

// Which kinds of quest ask for proof.
function ProofChoice({ user, player }) {
  const track = useTrack();
  const { color, font } = useTheme();
  const on = proofSettings(player);
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
      {PROOF_KINDS.map((k) => (
        <Pressable key={k} accessibilityRole="switch" accessibilityState={{ checked: on[k] }} onPress={() => track(setProof(user.uid, k, !on[k])).catch(() => {})}
          style={{ minHeight: 44, paddingHorizontal: 14, justifyContent: "center", borderWidth: 1, borderColor: on[k] ? color.frame : "rgba(159,203,255,0.22)", backgroundColor: on[k] ? "rgba(159,203,255,0.16)" : "transparent" }}>
          <Text style={{ fontFamily: font.bold, fontSize: 13, color: on[k] ? "#FFFFFF" : color.muted }}>{t.proof.kinds[k]}</Text>
        </Pressable>
      ))}
    </View>
  );
}

// Sound and vibration on or off.
// Your morning: which small wins start your day, the daily challenge and the morning check-in.
function Morning({ user, player }) {
  const { color, font } = useTheme();
  const track = useTrack();
  const items = player.morning?.items ?? MORNING_DEFAULT;
  const challenge = player.morning?.challenge !== false;
  const checkin = player.morning?.checkin !== false;
  const slow = player.morning?.slow !== false;
  const save = (next) => track(setMorning(user.uid, { items, challenge, checkin, ...next })).catch(() => {});
  const toggleItem = (id) => {
    const next = items.includes(id) ? items.filter((x) => x !== id) : [...items, id];
    if (!next.length || next.length > MORNING_MAX) return;
    save({ items: next });
  };
  return (
    <View style={{ gap: 8 }}>
      <Text style={{ fontFamily: font.body, fontSize: 13, lineHeight: 18, color: color.muted }}>{t.morning.pickSub}</Text>
      <View style={{ padding: 12, gap: 6, borderWidth: 1, borderColor: hasFullMorning(player) ? color.purple : "rgba(168,126,255,0.35)", backgroundColor: "rgba(168,126,255,0.06)" }}>
        <Text style={{ fontFamily: font.bold, fontSize: 12, letterSpacing: 2, color: color.purple }}>{t.morning.fullLabel}</Text>
        <Text style={{ fontFamily: font.body, fontSize: 13, lineHeight: 18, color: color.text }}>{fill(t.morning.fullSub, { c: FULL_MORNING_COINS, x: FULL_MORNING_XP })}</Text>
        {hasFullMorning(player) ? <Text style={{ fontFamily: font.bodyBold, fontSize: 12, color: color.purple }}>{t.morning.fullOn}</Text> : (
          <Pressable accessibilityRole="button" onPress={() => save({ items: [...new Set([...items, ...FULL_MORNING])] })} style={{ minHeight: 40, justifyContent: "center" }}>
            <Text style={{ fontFamily: font.bodyBold, fontSize: 13, color: color.accent }}>{t.morning.fullPick}</Text>
          </Pressable>
        )}
      </View>
      {MORNING_ITEMS.map((it) => {
        const on = items.includes(it.id);
        return (
          <Pressable key={it.id} accessibilityRole="checkbox" accessibilityState={{ checked: on }} onPress={() => toggleItem(it.id)}
            style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 10, minHeight: 46, paddingHorizontal: 12, borderWidth: 1,
              borderColor: on ? color.frame : "rgba(159,203,255,0.18)", backgroundColor: pressed ? "rgba(159,203,255,0.16)" : on ? "rgba(159,203,255,0.08)" : "transparent" })}>
            <Text style={{ width: 18, fontFamily: font.bold, fontSize: 15, color: on ? color.accent : color.muted }}>{on ? "✓" : "+"}</Text>
            <Text style={{ flex: 1, fontFamily: font.bodyBold, fontSize: 14, color: on ? "#FFFFFF" : color.text }}>{t.morning.items[it.id]}</Text>
            <Text style={{ fontFamily: font.body, fontSize: 12, color: color.muted }}>{fill(t.morning.min, { n: it.minutes })}</Text>
          </Pressable>
        );
      })}
      {[["slow", slow, t.morning.slowToggle, t.morning.slowToggleSub], ["challenge", challenge, t.morning.challengeToggle, t.morning.challengeToggleSub], ["checkin", checkin, t.morning.checkinToggle, t.morning.checkinToggleSub]].map(([k, on, label, sub]) => (
        <View key={k} style={{ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 52 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: font.bodyBold, fontSize: 14, color: color.text }}>{label}</Text>
            <Text style={{ fontFamily: font.body, fontSize: 12, lineHeight: 17, color: color.muted }}>{sub}</Text>
          </View>
          <Switch accessibilityLabel={label} value={on} onValueChange={(v) => save({ [k]: v })} trackColor={{ false: "#1A2740", true: color.frame }} thumbColor="#FFFFFF" />
        </View>
      ))}
    </View>
  );
}

// Delete your account: a warning, your password, and everything goes (Apple requires this in the app).
function DeleteAccount() {
  const { color, font } = useTheme();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  async function go() {
    setBusy(true);
    setError(null);
    try {
      await deleteAccount(password);
    } catch (e) {
      const code = String(e?.code ?? "");
      setError(code.includes("wrong-password") || code.includes("invalid-credential") ? t.deleteAccount.wrongPassword : t.deleteAccount.failed);
      setBusy(false);
    }
  }
  if (!open) return <Button kind="text" label={t.deleteAccount.open} onPress={() => setOpen(true)} style={{ alignSelf: "flex-start", paddingHorizontal: 0 }} />;
  return (
    <View style={{ gap: 10, padding: 12, borderWidth: 1, borderColor: color.danger }}>
      <Text style={{ fontFamily: font.bold, fontSize: 13, letterSpacing: 2, color: color.dangerSoft }}>{t.deleteAccount.title}</Text>
      <Text style={{ fontFamily: font.body, fontSize: 13, lineHeight: 18, color: color.text }}>{t.deleteAccount.warning}</Text>
      <TextInput value={password} onChangeText={(v) => { setPassword(v); setError(null); }} secureTextEntry placeholder={t.deleteAccount.password} placeholderTextColor="#4A5A7A"
        autoCapitalize="none" accessibilityLabel={t.deleteAccount.password}
        style={{ minHeight: 44, paddingHorizontal: 12, fontFamily: font.body, fontSize: 15, color: "#FFFFFF", borderWidth: 1, borderColor: "rgba(159,203,255,0.3)", backgroundColor: "rgba(5,10,24,0.7)" }} />
      {error ? <Text style={{ fontFamily: font.bodyMedium, fontSize: 13, color: color.dangerSoft }}>{error}</Text> : null}
      <Pressable accessibilityRole="button" disabled={busy || !password} onPress={go}
        style={({ pressed }) => ({ minHeight: 46, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: color.danger, opacity: !password ? 0.5 : 1,
          backgroundColor: pressed ? "rgba(255,80,80,0.25)" : "rgba(255,80,80,0.1)" })}>
        <Text style={{ fontFamily: font.bold, fontSize: 13, letterSpacing: 2, color: "#FFFFFF" }}>{busy ? t.deleteAccount.busy : t.deleteAccount.confirm}</Text>
      </Pressable>
      <Button kind="text" label={t.deleteAccount.cancel} onPress={() => { setOpen(false); setPassword(""); setError(null); }} style={{ alignSelf: "flex-start", paddingHorizontal: 0 }} />
    </View>
  );
}

// Tester tools: only on accounts marked tester in the Firebase console.
function Tester({ user, player }) {
  const { color, font } = useTheme();
  const [busy, setBusy] = useState(false);
  const [sure, setSure] = useState(false);
  const [msg, setMsg] = useState(null);
  async function run(fn, done) {
    setBusy(true);
    setMsg(null);
    try { await fn(); setMsg(done); } catch { setMsg(t.tester.failed); } finally { setBusy(false); setSure(false); }
  }
  return (
    <View style={{ gap: 10 }}>
      <Button label={t.tester.fill} disabled={busy} onPress={() => run(() => testerFill(user.uid), t.tester.filled)} />
      <Button kind={sure ? undefined : "text"} label={sure ? t.tester.resetSure : t.tester.reset} disabled={busy}
        onPress={() => (sure ? run(() => testerReset(user.uid, player), t.tester.resetDone) : setSure(true))} />
      {msg ? <Text style={{ fontFamily: font.bodyMedium, fontSize: 13, color: color.muted }}>{msg}</Text> : null}
    </View>
  );
}

function Feel({ user, player }) {
  const { color, font } = useTheme();
  const track = useTrack();
  const on = { vibration: player.feel?.vibration !== false, sound: player.feel?.sound !== false };
  return (
    <View>
      {["vibration", "sound"].map((k, i) => (
        <View key={k} style={{ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 52, borderTopWidth: i ? 1 : 0, borderTopColor: color.line }}>
          <Text style={{ flex: 1, fontFamily: font.bodyMedium, fontSize: 14, color: color.text }}>{t.feel[k]}</Text>
          <Switch value={on[k]} accessibilityLabel={t.feel[k]} trackColor={{ false: "#1A2740", true: color.frame }} thumbColor="#FFFFFF"
            onValueChange={(v) => { setFeel({ ...on, [k]: v }); track(setFeelSetting(user.uid, k, v)).catch(() => {}); }} />
        </View>
      ))}
    </View>
  );
}

// What your friends can see.
function Privacy({ user, player }) {
  const track = useTrack();
  const { color, font } = useTheme();
  const on = privacySettings(player);
  return (
    <View>
      {PRIVACY_KEYS.map((k, i) => (
        <View key={k} style={{ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 52, borderTopWidth: i ? 1 : 0, borderTopColor: color.line }}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: font.bodyMedium, fontSize: 14, color: color.text }}>{t.privacy.keys[k]}</Text>
          </View>
          <Switch value={on[k]} onValueChange={(v) => track(setPrivacy(user.uid, k, v)).catch(() => {})} accessibilityLabel={t.privacy.keys[k]}
            trackColor={{ false: "#1A2740", true: color.frame }} thumbColor="#FFFFFF" />
        </View>
      ))}
    </View>
  );
}

// A proof photo from the quest log, full screen.
function ProofView({ uid, logId, onClose }) {
  const { color, font } = useTheme();
  const [img, setImg] = useState(undefined);
  useEffect(() => { loadProof(uid, logId).then(setImg).catch(() => setImg(null)); }, [uid, logId]);
  return (
    <Modal transparent animationType="fade" visible onRequestClose={onClose}>
      <Pressable accessibilityRole="button" accessibilityLabel={t.proof.close} onPress={onClose} style={{ flex: 1, backgroundColor: "rgba(1,4,10,0.95)", alignItems: "center", justifyContent: "center", padding: 16 }}>
        {img ? <Image source={{ uri: img }} resizeMode="contain" style={{ width: "100%", height: "80%" }} /> : (
          <Text style={{ fontFamily: font.body, fontSize: 14, color: color.muted }}>{img === null ? t.proof.missing : t.settings.loading}</Text>
        )}
        <Text style={{ marginTop: 14, fontFamily: font.bodyBold, fontSize: 14, color: color.accent }}>{t.proof.close}</Text>
      </Pressable>
    </Modal>
  );
}

function History({ uid, honesty }) {
  const { color, font } = useTheme();
  const summary = honesty?.checked
    ? fill(t.settings.honesty, { n: honesty.checked, c: honesty.cheated ?? 0 })
    : t.settings.honestyNone;
  const { items, error } = useHistory(uid);
  const [view, setView] = useState(null);
  const head = <Text style={{ fontFamily: font.bodyMedium, fontSize: 13, color: honesty?.cheated ? "#F6B45A" : color.muted }}>{summary}</Text>;
  if (!items) return <View style={{ gap: 8 }}>{head}<Text style={{ fontFamily: font.body, fontSize: 13, color: color.muted }}>{t.settings.loading}</Text></View>;
  if (error) return <Text style={{ fontFamily: font.body, fontSize: 13, color: color.dangerSoft }}>{t.settings.historyError}</Text>;
  if (!items.length) return <Text style={{ fontFamily: font.body, fontSize: 13, color: color.muted }}>{t.settings.historyEmpty}</Text>;
  return (
    <View>
      {head}
      {items.map((it, i) => {
        const header = i === 0 || items[i - 1].date !== it.date ? it.date : null;
        return (
          <View key={it.id}>
            {header ? <Text style={{ marginTop: 10, marginBottom: 2, fontFamily: font.bold, fontSize: 11, letterSpacing: 2, color: color.muted }}>{header}</Text> : null}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8, borderTopWidth: 1, borderTopColor: color.line }}>
              <Text style={{ width: 34, fontFamily: font.bold, fontSize: 11, letterSpacing: 1, color: color.accent }}>{it.stat}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: font.bodyMedium, fontSize: 14, lineHeight: 19, color: color.text }}>{it.title}</Text>
                {it.value != null ? <Text style={{ fontFamily: font.num, fontSize: 13, color: color.muted }}>{it.unit === "seconds" ? `${Math.floor(it.value / 60)}:${String(it.value % 60).padStart(2, "0")}` : `${it.value} ${t.sheet.reps}`}</Text> : null}
                {it.how || it.cheat || it.quick ? (
                  <Text style={{ fontFamily: font.body, fontSize: 12, color: color.muted }}>
                    {[it.quick ? t.settings.quickTag : null, it.how ? t.checkIn.hows[it.how] : null].filter(Boolean).join(" · ")}
                    {it.cheat && it.cheat !== "no" ? <Text style={{ color: "#F6B45A" }}>{`${it.how || it.quick ? " · " : ""}${t.checkIn.cheat} ${t.checkIn.cheats[it.cheat]}`}</Text> : null}
                  </Text>
                ) : null}
              </View>
              {it.proof === "photo" ? (
                <Pressable accessibilityRole="button" onPress={() => setView(it.id)} style={{ minHeight: 36, justifyContent: "center", paddingHorizontal: 6 }}>
                  <Text style={{ fontFamily: font.bodyBold, fontSize: 12, color: color.accent }}>{t.proof.photo}</Text>
                </Pressable>
              ) : it.proof === "none" ? <Text style={{ fontFamily: font.body, fontSize: 12, color: "#F6B45A" }}>{t.proof.none}</Text> : null}
              <Coins value={Math.abs((it.coins ?? 0) + (it.bonus ?? 0))} sign={(it.coins ?? 0) + (it.bonus ?? 0) < 0 ? "−" : "+"} size={14} />
            </View>
          </View>
        );
      })}
      {view ? <ProofView uid={uid} logId={view} onClose={() => setView(null)} /> : null}
    </View>
  );
}

export default function Settings({ user, player, synced }) {
  // Groups fold, one open at a time, so Settings isn't one long scroll.
  const [openGroup, setOpenGroup] = useState(null);
  // One section open at a time; opening one scrolls it to the top so you don't hunt for it.
  const scrollRef = useRef(null);
  const sectionY = useRef({});
  const fold = (id) => ({
    open: openGroup === id,
    onLayout: (e) => { sectionY.current[id] = e.nativeEvent.layout.y; },
    onToggle: () => {
      const opening = openGroup !== id;
      setOpenGroup(opening ? id : null);
      if (opening) setTimeout(() => scrollRef.current?.scrollTo({ y: Math.max(0, (sectionY.current[id] ?? 0) - 8), animated: true }), 60);
    },
  });
  const { color, font } = useTheme();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState(player.name ?? "");
  const [feedback, setFeedback] = useState(false);
  const [gymOpen, setGymOpen] = useState(false);
  const [schedOpen, setSchedOpen] = useState(false);
  const { stamp, track, Provider } = useSavedStamp();

  // Changing your name: the first change is free, then it costs coins (so it means something).
  const [nameError, setNameError] = useState(null);
  const namePrice = (player.nameChanges ?? 0) > 0 ? NAME_CHANGE_PRICE : 0;
  const nameChanged = name.trim().length >= 2 && name.trim() !== player.name;
  function saveName() {
    setNameError(null);
    track(changeName(user.uid, name, t.settings.nameLog)).catch((e) => setNameError(e.message === "no-coins" ? fill(t.settings.nameNoCoins, { n: namePrice }) : t.shop.failed));
  }

  const today = todayKey();
  const severity = severityFor(player, today);
  const pendingSeverity = player.penaltySeverityNext && player.penaltySeverityFrom > today ? player.penaltySeverityNext : null;

  return (
    <Provider value={track}>
    <View style={{ flex: 1, backgroundColor: color.bg }}>
    <ScrollView ref={scrollRef} style={{ flex: 1, backgroundColor: color.bg }} keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ paddingTop: insets.top + 14, paddingBottom: 40, paddingHorizontal: 14, maxWidth: 520, width: "100%", alignSelf: "center" }}>
      <Glow height={380} at={0.18} />
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 4 }}>
        <Label tone={color.hi} style={{ letterSpacing: 5, fontSize: 12 }}>{t.status.system}</Label>
        <Coins value={player.coins ?? 0} size={18} />
      </View>
      <Text accessibilityRole="header" style={{ marginTop: 20, marginBottom: 6, textAlign: "center", fontFamily: font.bold, fontSize: 26, letterSpacing: 1, color: "#FFFFFF" }}>{t.settings.title}</Text>

      <GroupLabel text={t.settings.groups.you} />
      <Section title={t.settings.profile} {...fold("profile")}>
        <View style={{ flexDirection: "row", gap: 8, alignItems: "flex-end" }}>
          <View style={{ flex: 1 }}><Input label={t.settings.name} value={name} onChangeText={(v) => { setName(v); setNameError(null); }} maxLength={24} /></View>
        </View>
        {nameChanged ? (
          <SysButton label={namePrice ? fill(t.settings.nameCost, { n: namePrice }) : t.settings.nameFree} onPress={saveName} />
        ) : <Text style={{ fontFamily: font.body, fontSize: 12, color: color.muted }}>{namePrice ? fill(t.settings.nameHint, { n: namePrice }) : t.settings.nameHintFree}</Text>}
        {nameError ? <Text style={{ fontFamily: font.body, fontSize: 13, color: "#F6B45A" }}>{nameError}</Text> : null}
      </Section>
      <Section title={t.tune.title} sub={t.tune.sub} {...fold("s2")}>
        <Tune user={user} player={player} />
      </Section>
      <Section title={t.morning.section} sub={t.morning.sectionSub} {...fold("morning")}>
        <Morning user={user} player={player} />
      </Section>
      <Section title={t.gym.section} sub={t.gym.sectionSub} {...fold("s7")}>
        <Text style={{ fontFamily: font.bodyMedium, fontSize: 14, color: color.text }}>
          {player.gym ? fill(t.gym.summary, { name: TEMPLATES[player.gym.template]?.name ?? "", days: player.gym.weekdays.map((d) => t.gym.weekdays[d]).join(" ") || t.gym.noDays }) : t.gym.none}
        </Text>
        <SysButton label={player.gym ? t.gym.edit : t.gym.setUp} onPress={() => setGymOpen(true)} />
      </Section>
      {gymOpen ? <GymSetup user={user} player={player} onClose={() => setGymOpen(false)} /> : null}

      <GroupLabel text={t.settings.groups.day} />
      <Section title={t.schedule.section} sub={t.schedule.sectionSub} {...fold("s6")}>
        <Text style={{ fontFamily: font.bodyMedium, fontSize: 14, color: color.text }}>{fill(t.schedule.summary, { n: (player.schedule ?? []).length })}</Text>
        <SysButton label={t.schedule.open} onPress={() => setSchedOpen(true)} />
      </Section>
      {schedOpen ? <Schedule user={user} player={player} onClose={() => setSchedOpen(false)} /> : null}
      <Section title={t.agenda.title} sub={t.agenda.sub} {...fold("agenda")}>
        <Agenda user={user} player={player} />
      </Section>
      <Section title={t.reminders.title} sub={t.reminders.sub} {...fold("s10")}>
        <Reminders user={user} player={player} />
      </Section>
      <Section title={t.places.title} sub={t.places.sub} {...fold("s3")}>
        <Places user={user} player={player} />
      </Section>

      <GroupLabel text={t.settings.groups.game} />
      <Section title={t.settings.system} {...fold("s5")}>
        <Pressable accessibilityRole="switch" accessibilityState={{ checked: player.simple === true }}
          onPress={() => track(setSimple(user.uid, player.simple !== true)).catch(() => {})}
          style={{ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 52 }}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ fontFamily: font.bodyBold, fontSize: 15, color: "#FFFFFF" }}>{t.settings.simple}</Text>
            <Text style={{ fontFamily: font.body, fontSize: 12, lineHeight: 17, color: color.muted }}>{t.settings.simpleSub}</Text>
          </View>
          <View style={{ width: 46, height: 26, borderWidth: 1, borderColor: player.simple ? color.accent : "rgba(159,203,255,0.35)", backgroundColor: player.simple ? "rgba(159,203,255,0.25)" : "transparent", justifyContent: "center", paddingHorizontal: 3 }}>
            <View style={{ width: 18, height: 18, backgroundColor: player.simple ? "#FFFFFF" : color.muted, alignSelf: player.simple ? "flex-end" : "flex-start" }} />
          </View>
        </Pressable>
        <View style={{ gap: 8 }}>
          <Label>{t.difficulty.title}</Label>
          <DifficultyChips value={difficultyOf(player)} onChange={(d) => { if (!isHard(player)) track(setDifficulty(user.uid, d)).catch(() => {}); }} />
        </View>
        <View style={{ gap: 8 }}>
          <Label>{t.settings.urgent.toUpperCase()}</Label>
          <Text style={{ fontFamily: font.body, fontSize: 12, lineHeight: 17, color: color.muted }}>{t.settings.urgentSub}</Text>
          <UrgentChips value={urgentPerDayOf(player)} onChange={(n) => { if (!isHard(player)) track(setUrgentPerDay(user.uid, n)).catch(() => {}); }} />
        </View>
        <View style={{ gap: 8 }}>
          <Label>{t.settings.severity.toUpperCase()}</Label>
          <SeverityChips value={pendingSeverity ?? severity} onChange={(s) => { if (!isHard(player)) track(scheduleSeverity(user.uid, s)).catch(() => {}); }} />
          {isHard(player) ? <Text style={{ fontFamily: font.body, fontSize: 12, color: color.muted }}>{t.hard.settingsLocked}</Text> : null}
          {pendingSeverity ? <Text style={{ fontFamily: font.bodyMedium, fontSize: 12, color: color.frame }}>{fill(t.settings.severityNext, { sev: t.penalty.severities[pendingSeverity] })}</Text> : null}
        </View>
      </Section>
      <Section title={t.hard.title} sub={t.hard.sub} {...fold("s4")}>
        <HardMode user={user} player={player} />
      </Section>
      <Section title={t.proof.title} sub={t.proof.sub} {...fold("s8")}>
        <ProofChoice user={user} player={player} />
      </Section>

      <GroupLabel text={t.settings.groups.app} />
      <Section title={t.notify.section} {...fold("s12")}>
        <Notifications user={user} player={player} />
        <Voice user={user} player={player} />
      </Section>
      <Section title={t.feel.title} sub={t.feel.sub} {...fold("s11")}>
        <Feel user={user} player={player} />
      </Section>
      <Section title={t.privacy.title} sub={t.privacy.sub} {...fold("s9")}>
        <Privacy user={user} player={player} />
      </Section>

      <GroupLabel text={t.settings.groups.more} />
      <Section title={t.explain.section} sub={t.explain.sectionSub} {...fold("s14")}>
        <Glossary />
      </Section>
      <Section title={t.settings.history} {...fold("s15")}>
        <History uid={user.uid} honesty={player.honesty} />
      </Section>
      <Section title={t.feedback.section} sub={t.feedback.sectionSub} {...fold("s13")}>
        <SysButton label={t.feedback.open} onPress={() => setFeedback(true)} />
      </Section>
      {feedback ? <FeedbackSheet user={user} player={player} onClose={() => setFeedback(false)} /> : null}
      <Section title={t.settings.account} {...fold("s16")}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <View style={{ width: 7, height: 7, transform: [{ rotate: "45deg" }], backgroundColor: synced ? color.accent : color.muted }} />
          <Text style={{ fontFamily: font.body, fontSize: 13, color: synced ? color.accent : color.muted }}>{synced ? t.home.synced : t.home.syncing}</Text>
        </View>
        {Platform.OS !== "web" ? (
          <Text style={{ fontFamily: font.body, fontSize: 12, color: color.muted }}>{Updates.isEmbeddedLaunch ? t.home.builtIn : t.home.overTheAir}</Text>
        ) : null}
        <Button kind="text" label={t.home.logout} onPress={() => signOut(auth)} style={{ alignSelf: "flex-start", paddingHorizontal: 0 }} />
        <DeleteAccount />
      </Section>
      {isTester(player) ? (
        <Section title={t.tester.title} sub={t.tester.sub}>
          <Tester user={user} player={player} />
        </Section>
      ) : null}

    </ScrollView>
    <SavedStamp stamp={stamp} />
    </View>
    </Provider>
  );
}
