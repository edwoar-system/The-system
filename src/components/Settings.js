// Settings tab: profile, Tune the System (questionnaire), quotes, the System settings, reminders, quest history and the account.
import { useEffect, useState } from "react";
import { Image, Modal, Platform, Pressable, ScrollView, Switch, Text, TextInput, View } from "react-native";
import * as Updates from "expo-updates";
import { signOut } from "firebase/auth";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { auth } from "../lib/firebase";
import { setFeelSetting, setNotify, toggleFavQuote, setPlayerName, setPrivacy, setProof, setReminders } from "../lib/player";
import { setFeel } from "../lib/haptics";
import { SavedStamp, useSavedStamp, useTrack } from "./saved";
import { PRIVACY_KEYS, privacySettings } from "../game/social";
import { loadProof } from "../lib/proof";
import { PROOF_KINDS, proofSettings } from "../game/proof";
import { askNotifyPermission, notifyPermission, notifySupported } from "../lib/notify";
import { NOTIFY_KINDS, notifySettings } from "../game/notify";
import { setUrgentPerDay } from "../lib/urgent";
import { scheduleSeverity } from "../lib/penalty";
import { useHistory } from "../lib/history";
import { URGENT } from "../game/urgent";
import { severityFor } from "../game/penalty";
import { todayKey } from "../game/quests";
import { Coins, Frame, Glow, Label, SysButton } from "./sys";
import { Button } from "./ui";
import { SeverityChips, UrgentChips } from "./systemChoices";
import Tune from "./Tune";
import QuoteLibrary from "./QuoteLibrary";
import { useTheme } from "../theme";
import { t } from "../i18n";
import { Glossary } from "./Explain";
import { FeedbackSheet } from "./Feedback";

const fill = (s, vars) => Object.entries(vars).reduce((acc, [k, v]) => acc.split(`{${k}}`).join(String(v)), s);

function Input({ label, value, onChangeText, keyboardType, width }) {
  const { color, font } = useTheme();
  return (
    <View style={{ gap: 6, width }}>
      <Text style={{ fontFamily: font.bodyBold, fontSize: 12, color: color.muted }}>{label}</Text>
      <TextInput value={value} onChangeText={onChangeText} keyboardType={keyboardType} accessibilityLabel={label}
        placeholderTextColor={color.muted}
        style={{ minHeight: 46, paddingHorizontal: 12, fontFamily: font.bodyMedium, fontSize: 16, color: "#FFFFFF", borderWidth: 1, borderColor: "rgba(159,203,255,0.3)", backgroundColor: "rgba(5,10,24,0.7)" }} />
    </View>
  );
}

function Section({ title, sub, children }) {
  const { color, font } = useTheme();
  return (
    <Frame cut={14} style={{ marginTop: 14 }} contentStyle={{ padding: 16, gap: 12 }}>
      <View style={{ gap: 4 }}>
        <Label tone={color.hi}>{title}</Label>
        {sub ? <Text style={{ fontFamily: font.body, fontSize: 13, lineHeight: 18, color: color.muted }}>{sub}</Text> : null}
      </View>
      {children}
    </Frame>
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
  return (
    <View style={{ gap: 4 }}>
      {perm === "granted" ? <Text style={{ fontFamily: font.body, fontSize: 13, color: color.accent }}>{t.notify.allowed}</Text> : null}
      {perm === "denied" ? <Text style={{ fontFamily: font.body, fontSize: 13, lineHeight: 18, color: color.dangerSoft }}>{t.notify.denied}</Text> : null}
      {perm === "undetermined" ? <SysButton label={t.notify.ask} onPress={async () => setPerm(await askNotifyPermission())} /> : null}
      {NOTIFY_KINDS.map((k) => (
        <View key={k} style={{ minHeight: 48, flexDirection: "row", alignItems: "center", justifyContent: "space-between", borderTopWidth: 1, borderTopColor: color.line }}>
          <Text style={{ fontFamily: font.bodyMedium, fontSize: 14, color: color.text }}>{t.notify.kinds[k]}</Text>
          <Switch accessibilityLabel={t.notify.kinds[k]} value={on[k]} onValueChange={(v) => track(setNotify(user.uid, k, v)).catch(() => {})}
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
  const list = player.reminders ?? [];
  const shown = list.filter((r) => r.repeat === "daily" || r.date >= todayKey()); // past one-off reminders are hidden

  async function add() {
    const m = time.trim().match(/^(\d{1,2})[:.](\d{2})$/);
    if (!m || Number(m[1]) > 23 || Number(m[2]) > 59) { setError(t.reminders.badTime); return; }
    const hhmm = `${m[1].padStart(2, "0")}:${m[2]}`;
    // A one-off reminder is for today, or tomorrow when the time has already passed.
    const now = new Date();
    const when = new Date(now.getFullYear(), now.getMonth(), now.getDate(), Number(m[1]), Number(m[2]));
    if (when <= now) when.setDate(when.getDate() + 1);
    const r = { id: String(Date.now()), text: text.trim(), time: hhmm, repeat: daily ? "daily" : "once", ...(daily ? {} : { date: todayKey(when) }) };
    setError(null);
    await track(setReminders(user.uid, [...list, r]));
    setText("");
    setTime("");
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
          <Pressable accessibilityRole="button" accessibilityLabel={`${t.reminders.remove}: ${r.text}`} onPress={() => track(setReminders(user.uid, list.filter((x) => x.id !== r.id))).catch(() => {})}
            style={{ minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontFamily: font.bodyBold, fontSize: 13, color: color.muted }}>{t.reminders.remove}</Text>
          </Pressable>
        </View>
      )) : <Text style={{ fontFamily: font.body, fontSize: 13, color: color.muted }}>{t.reminders.empty}</Text>}
      <Input label={t.reminders.what} value={text} onChangeText={setText} />
      <View style={{ flexDirection: "row", gap: 8, alignItems: "flex-end" }}>
        <Input label={t.reminders.time} value={time} onChangeText={(v) => { setTime(v); setError(null); }} keyboardType="numbers-and-punctuation" width={120} />
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
      <SysButton label={t.reminders.add} onPress={add} disabled={!text.trim() || !time.trim()} />
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
              <Coins value={(it.coins ?? 0) + (it.bonus ?? 0)} sign="+" size={14} />
            </View>
          </View>
        );
      })}
      {view ? <ProofView uid={uid} logId={view} onClose={() => setView(null)} /> : null}
    </View>
  );
}

export default function Settings({ user, player, synced }) {
  const { color, font } = useTheme();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState(player.name ?? "");
  const [quotes, setQuotes] = useState(false);
  const [feedback, setFeedback] = useState(false);
  const { stamp, track, Provider } = useSavedStamp();

  // Your name saves itself a moment after you stop typing.
  useEffect(() => {
    const v = name.trim();
    if (!v || v === player.name) return;
    const id = setTimeout(() => { track(setPlayerName(user.uid, v)).catch(() => {}); }, 900);
    return () => clearTimeout(id);
  }, [name, player.name, user.uid, track]);

  const today = todayKey();
  const severity = severityFor(player, today);
  const pendingSeverity = player.penaltySeverityNext && player.penaltySeverityFrom > today ? player.penaltySeverityNext : null;

  return (
    <Provider value={track}>
    <View style={{ flex: 1, backgroundColor: color.bg }}>
    <ScrollView style={{ flex: 1, backgroundColor: color.bg }} keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ paddingTop: insets.top + 14, paddingBottom: 40, paddingHorizontal: 14, maxWidth: 520, width: "100%", alignSelf: "center" }}>
      <Glow height={380} at={0.18} />
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 4 }}>
        <Label tone={color.hi} style={{ letterSpacing: 5, fontSize: 12 }}>{t.status.system}</Label>
        <Coins value={player.coins ?? 0} size={18} />
      </View>
      <Text accessibilityRole="header" style={{ marginTop: 20, marginBottom: 6, textAlign: "center", fontFamily: font.bold, fontSize: 26, letterSpacing: 1, color: "#FFFFFF" }}>{t.settings.title}</Text>

      <Section title={t.settings.profile}>
        <View style={{ flexDirection: "row", gap: 8, alignItems: "flex-end" }}>
          <View style={{ flex: 1 }}><Input label={t.settings.name} value={name} onChangeText={setName} /></View>
        </View>
      </Section>

      <Section title={t.tune.title} sub={t.tune.sub}>
        <Tune user={user} player={player} />
      </Section>

      <Section title={t.quote.section} sub={t.quote.sectionSub}>
        <SysButton label={t.quote.open} onPress={() => setQuotes(true)} />
      </Section>
      {quotes ? <QuoteLibrary mine={player.profile?.schools ?? []} favs={player.favQuotes ?? []}
        onStar={(id) => toggleFavQuote(user.uid, id, !(player.favQuotes ?? []).includes(id)).catch(() => {})} onClose={() => setQuotes(false)} /> : null}

      <Section title={t.settings.system}>
        <View style={{ gap: 8 }}>
          <Label>{t.settings.urgent.toUpperCase()}</Label>
          <UrgentChips value={player.urgentPerDay ?? URGENT.defaultPerDay} onChange={(n) => track(setUrgentPerDay(user.uid, n)).catch(() => {})} />
        </View>
        <View style={{ gap: 8 }}>
          <Label>{t.settings.severity.toUpperCase()}</Label>
          <SeverityChips value={pendingSeverity ?? severity} onChange={(s) => track(scheduleSeverity(user.uid, s)).catch(() => {})} />
          {pendingSeverity ? <Text style={{ fontFamily: font.bodyMedium, fontSize: 12, color: color.frame }}>{fill(t.settings.severityNext, { sev: t.penalty.severities[pendingSeverity] })}</Text> : null}
        </View>
      </Section>

      <Section title={t.proof.title} sub={t.proof.sub}>
        <ProofChoice user={user} player={player} />
      </Section>

      <Section title={t.privacy.title} sub={t.privacy.sub}>
        <Privacy user={user} player={player} />
      </Section>

      <Section title={t.reminders.title} sub={t.reminders.sub}>
        <Reminders user={user} player={player} />
      </Section>

      <Section title={t.feel.title} sub={t.feel.sub}>
        <Feel user={user} player={player} />
      </Section>

      <Section title={t.notify.section}>
        <Notifications user={user} player={player} />
      </Section>

      <Section title={t.feedback.section} sub={t.feedback.sectionSub}>
        <SysButton label={t.feedback.open} onPress={() => setFeedback(true)} />
      </Section>
      {feedback ? <FeedbackSheet user={user} player={player} onClose={() => setFeedback(false)} /> : null}

      <Section title={t.explain.section} sub={t.explain.sectionSub}>
        <Glossary />
      </Section>

      <Section title={t.settings.history}>
        <History uid={user.uid} honesty={player.honesty} />
      </Section>

      <Section title={t.settings.account}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <View style={{ width: 7, height: 7, transform: [{ rotate: "45deg" }], backgroundColor: synced ? color.accent : color.muted }} />
          <Text style={{ fontFamily: font.body, fontSize: 13, color: synced ? color.accent : color.muted }}>{synced ? t.home.synced : t.home.syncing}</Text>
        </View>
        {Platform.OS !== "web" ? (
          <Text style={{ fontFamily: font.body, fontSize: 12, color: color.muted }}>{Updates.isEmbeddedLaunch ? t.home.builtIn : t.home.overTheAir}</Text>
        ) : null}
        <Button kind="text" label={t.home.logout} onPress={() => signOut(auth)} style={{ alignSelf: "flex-start", paddingHorizontal: 0 }} />
      </Section>
    </ScrollView>
    <SavedStamp stamp={stamp} />
    </View>
    </Provider>
  );
}
