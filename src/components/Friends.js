// Friends tab: your friend code, adding someone by code, requests, and your friends' cards.
import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Modal, Pressable, ScrollView, Share, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { acceptRequest, declineRequest, findByCode, myCode, removeFriend, sendRequest, sendTroll, useFriends, useRequests, useSentTroll } from "../lib/social";
import { activeAgo, cleanCode, MAX_FRIENDS, TROLLS, trollById } from "../game/social";
import { todayKey } from "../game/quests";
import { RANKS } from "../game/ladders";
import { skillById } from "../game/guild";
import { doneFeel, lockFeel, tapFeel } from "../lib/haptics";
import StatShape from "./StatShape";
import StatInfo from "./StatInfo";
import { RankHex } from "./skillParts";
import { Frame, Glow, Label, SysButton } from "./sys";
import { useTheme } from "../theme";
import { t } from "../i18n";

const fill = (s, vars) => Object.entries(vars).reduce((acc, [k, v]) => acc.split(`{${k}}`).join(String(v)), s);

function lastSeen(card) {
  const d = activeAgo(card?.active);
  if (d == null) return "";
  return d === 0 ? t.friends.activeToday : d === 1 ? t.friends.activeYesterday : fill(t.friends.activeAgo, { n: d });
}

function Section({ title, sub, children, right }) {
  const { color, font } = useTheme();
  return (
    <Frame cut={12} style={{ marginTop: 12, marginHorizontal: 14 }} contentStyle={{ padding: 16, gap: 12 }}>
      <View style={{ gap: 4 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
          <Label tone={color.hi}>{title}</Label>
          {right}
        </View>
        {sub ? <Text style={{ fontFamily: font.body, fontSize: 13, lineHeight: 18, color: color.muted }}>{sub}</Text> : null}
      </View>
      {children}
    </Frame>
  );
}

// Hold to confirm: fills over a second, vibrates when it locks. For things you shouldn't do by accident.
function HoldButton({ label, onDone, tone }) {
  const { color, font } = useTheme();
  const p = useRef(new Animated.Value(0)).current;
  const anim = useRef(null);
  const start = () => {
    tapFeel();
    anim.current = Animated.timing(p, { toValue: 1, duration: 1000, easing: Easing.linear, useNativeDriver: false });
    anim.current.start(({ finished }) => { if (finished) { lockFeel(); onDone(); } p.setValue(0); });
  };
  const stop = () => { anim.current?.stop(); Animated.timing(p, { toValue: 0, duration: 150, useNativeDriver: false }).start(); };
  const c = tone ?? color.muted;
  return (
    <Pressable accessibilityRole="button" accessibilityHint={t.friends.holdHint} onPressIn={start} onPressOut={stop}
      style={{ minHeight: 48, justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: c, overflow: "hidden" }}>
      <Animated.View style={{ position: "absolute", left: 0, top: 0, bottom: 0, backgroundColor: "rgba(246,180,90,0.18)", width: p.interpolate({ inputRange: [0, 1], outputRange: ["0%", "100%"] }) }} />
      <Text style={{ fontFamily: font.bold, fontSize: 13, letterSpacing: 1, color: c }}>{label}</Text>
    </Pressable>
  );
}

// Pick a troll quest to send (or let the System pick).
function TrollPicker({ name, onPick, onClose }) {
  const { color, font } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal animationType="slide" visible onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: color.bg }}>
        <ScrollView contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 30, paddingHorizontal: 14, maxWidth: 520, width: "100%", alignSelf: "center", gap: 10 }}>
          <Pressable accessibilityRole="button" onPress={onClose} style={{ minHeight: 44, justifyContent: "center", alignSelf: "flex-start" }}>
            <Text style={{ fontFamily: font.bodyBold, fontSize: 14, color: color.accent }}>{`‹ ${t.friends.back}`}</Text>
          </Pressable>
          <Text accessibilityRole="header" style={{ fontFamily: font.bold, fontSize: 24, color: "#FFFFFF" }}>{fill(t.troll.pickTitle, { name })}</Text>
          <Text style={{ fontFamily: font.body, fontSize: 13, lineHeight: 18, color: color.muted }}>{t.troll.pickSub}</Text>
          <SysButton label={t.troll.surprise} onPress={() => onPick(TROLLS[Math.floor(Math.random() * TROLLS.length)].id)} />
          <Frame cut={12} contentStyle={{ paddingHorizontal: 14, paddingVertical: 4 }}>
            {TROLLS.map((x, i) => (
              <Pressable key={x.id} accessibilityRole="button" onPress={() => onPick(x.id)}
                style={({ pressed }) => ({ minHeight: 52, flexDirection: "row", alignItems: "center", gap: 12, borderTopWidth: i ? 1 : 0, borderTopColor: color.line, opacity: pressed ? 0.7 : 1 })}>
                <Text style={{ width: 34, fontFamily: font.bold, fontSize: 11, letterSpacing: 1, color: color.accent }}>{x.stat}</Text>
                <Text style={{ flex: 1, fontFamily: font.bodyMedium, fontSize: 15, color: "#FFFFFF" }}>{x.title}</Text>
              </Pressable>
            ))}
          </Frame>
        </ScrollView>
      </View>
    </Modal>
  );
}

// Send one troll quest a day, and see if they did it.
function TrollSection({ me, myName, friend }) {
  const { color, font } = useTheme();
  const date = todayKey();
  const sent = useSentTroll(me, friend.uid, date);
  const [picking, setPicking] = useState(false);
  const [error, setError] = useState(false);
  const name = friend.card?.name ?? friend.name;
  async function pick(id) {
    setPicking(false);
    setError(false);
    try { await sendTroll(me, myName, friend.uid, id, date); doneFeel(); } catch { setError(true); }
  }
  return (
    <Section title={t.troll.title} sub={fill(t.troll.sub, { name })}>
      {sent ? (
        <View style={{ gap: 4 }}>
          <Text style={{ fontFamily: font.bold, fontSize: 15, color: "#FFFFFF" }}>{trollById[sent.troll]?.title}</Text>
          <Text style={{ fontFamily: font.body, fontSize: 13, color: sent.status === "done" ? color.accent : color.muted }}>{t.troll.status[sent.status] ?? t.troll.status.new}</Text>
        </View>
      ) : (
        <SysButton label={t.troll.send} disabled={sent === undefined} onPress={() => setPicking(true)} />
      )}
      {error ? <Text style={{ fontFamily: font.body, fontSize: 13, color: "#F6B45A" }}>{t.troll.failed}</Text> : null}
      {picking ? <TrollPicker name={name} onPick={pick} onClose={() => setPicking(false)} /> : null}
    </Section>
  );
}

// One friend, full screen.
export function FriendPage({ friend, me, myName, onClose }) {
  const { color, font } = useTheme();
  const insets = useSafeAreaInsets();
  const [info, setInfo] = useState(null);
  const c = friend.card;
  const shown = c?.shown ?? {};
  const fact = (label, value) => (
    <View style={{ flex: 1, alignItems: "center", gap: 2 }}>
      <Text style={{ fontFamily: font.num, fontSize: 24, color: "#FFFFFF" }}>{value}</Text>
      <Text style={{ fontFamily: font.body, fontSize: 12, color: color.muted }}>{label}</Text>
    </View>
  );
  return (
    <Modal animationType="slide" visible onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: color.bg }}>
        <ScrollView contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 30, maxWidth: 520, width: "100%", alignSelf: "center" }}>
          <Glow height={520} at={0.22} />
          <Pressable accessibilityRole="button" onPress={onClose} style={{ minHeight: 44, justifyContent: "center", alignSelf: "flex-start", paddingHorizontal: 14 }}>
            <Text style={{ fontFamily: font.bodyBold, fontSize: 14, color: color.accent }}>{`‹ ${t.friends.back}`}</Text>
          </Pressable>
          {!c ? (
            <Text style={{ marginTop: 60, textAlign: "center", fontFamily: font.body, fontSize: 14, color: color.muted, paddingHorizontal: 30 }}>{t.friends.noCard}</Text>
          ) : (
            <>
              {c.stats ? <StatShape values={c.stats} onStat={setInfo} /> : null}
              <StatInfo stat={info} value={info ? c.stats?.[info] : null} onClose={() => setInfo(null)} />
              <View style={{ alignItems: "center", gap: 2, marginTop: c.stats ? 10 : 30 }}>
                <Label>{fill(t.friends.level, { n: c.level })}</Label>
                <Text style={{ fontFamily: font.displayHeavy, fontSize: 30, letterSpacing: 3, color: color.hi }}>{(c.name ?? friend.name).toUpperCase()}</Text>
                <Text style={{ fontFamily: font.body, fontSize: 12, color: color.muted }}>{lastSeen(c)}</Text>
              </View>

              {shown.streak || shown.today || shown.honesty ? (
                <Frame cut={12} style={{ marginTop: 18, marginHorizontal: 14 }} contentStyle={{ padding: 16, flexDirection: "row" }}>
                  {shown.streak ? fact(t.friends.streak, c.streak ?? 0) : null}
                  {shown.today ? fact(t.friends.today, c.today?.date === c.active ? `${c.today.done}/${c.today.of}` : "–") : null}
                  {shown.honesty ? fact(t.friends.honest, c.honesty?.checked ? `${Math.round(100 * (1 - (c.honesty.cheated ?? 0) / c.honesty.checked))}%` : "–") : null}
                </Frame>
              ) : null}

              {shown.skills ? (
                <Section title={t.friends.skills}>
                  {c.skills?.length ? (
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
                      {c.skills.map((s) => (
                        <View key={s.id} style={{ width: 92, alignItems: "center", gap: 6 }}>
                          <RankHex v={{ letter: RANKS[s.rank], trained: true, rusty: s.rusty }} size={38} />
                          <Text numberOfLines={2} style={{ textAlign: "center", fontFamily: font.bodyMedium, fontSize: 12, lineHeight: 16, color: color.text }}>{skillById[s.id]?.name ?? s.id}</Text>
                        </View>
                      ))}
                    </View>
                  ) : <Text style={{ fontFamily: font.body, fontSize: 13, color: color.muted }}>{t.friends.noSkills}</Text>}
                </Section>
              ) : null}

              {Object.values(shown).some((v) => !v) ? (
                <Text style={{ marginTop: 14, marginHorizontal: 18, fontFamily: font.body, fontSize: 12, color: color.muted }}>{t.friends.hidden}</Text>
              ) : null}
            </>
          )}
          <TrollSection me={me} myName={myName} friend={friend} />
          <View style={{ marginTop: 30, marginHorizontal: 14 }}>
            <HoldButton label={t.friends.remove} tone="#F6B45A" onDone={() => { removeFriend(me, friend.uid).catch(() => {}); onClose(); }} />
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

export default function Friends({ user, player }) {
  const { color, font } = useTheme();
  const insets = useSafeAreaInsets();
  const [code, setCode] = useState(null);
  const [input, setInput] = useState("");
  const [found, setFound] = useState(null); // { uid, name, code } | "none" | "self" | "friend" | "sent"
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(null);
  const requests = useRequests(user.uid);
  const { friends, error } = useFriends(user.uid);
  const name = player.name ?? "Player";

  useEffect(() => { myCode(user.uid, name).then(setCode).catch(() => setCode(null)); }, [user.uid, name]);

  async function find() {
    setBusy(true);
    try {
      const r = await findByCode(input);
      if (!r) setFound("none");
      else if (r.uid === user.uid) setFound("self");
      else if (friends?.some((f) => f.uid === r.uid)) setFound("friend");
      else setFound(r);
    } catch { setFound("none"); } finally { setBusy(false); }
  }
  async function send() {
    if (!found?.uid) return;
    setBusy(true);
    try {
      // They already asked you: accept instead of sending one back.
      const theirs = requests?.find((r) => r.uid === found.uid);
      if (theirs) await acceptRequest(user.uid, name, found.uid, found.name);
      else await sendRequest(user.uid, name, code, found.uid);
      doneFeel();
      setFound(theirs ? "friend" : "sent");
      setInput("");
    } catch { setFound("error"); } finally { setBusy(false); }
  }

  const full = (friends?.length ?? 0) >= MAX_FRIENDS;
  const msg = { none: t.friends.notFound, self: t.friends.self, friend: t.friends.already, sent: t.friends.sent, error: t.friends.failed };

  return (
    <View style={{ flex: 1, backgroundColor: color.bg }}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingTop: insets.top + 14, paddingBottom: 40, maxWidth: 520, width: "100%", alignSelf: "center" }}>
        <Glow height={420} at={0.18} />
        <Text accessibilityRole="header" style={{ marginTop: 20, marginBottom: 6, textAlign: "center", fontFamily: font.bold, fontSize: 26, letterSpacing: 1, color: "#FFFFFF" }}>{t.friends.title}</Text>

        {requests?.length ? (
          <Section title={t.friends.requests}>
            {requests.map((r) => (
              <View key={r.uid} style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingTop: 10, borderTopWidth: 1, borderTopColor: color.line }}>
                <Text style={{ flex: 1, fontFamily: font.bold, fontSize: 15, color: "#FFFFFF" }}>{r.name}</Text>
                <Pressable accessibilityRole="button" onPress={() => declineRequest(user.uid, r.uid).catch(() => {})} style={{ minHeight: 44, paddingHorizontal: 12, justifyContent: "center" }}>
                  <Text style={{ fontFamily: font.bodyBold, fontSize: 13, color: color.muted }}>{t.friends.decline}</Text>
                </Pressable>
                <SysButton label={t.friends.accept} disabled={full} onPress={() => acceptRequest(user.uid, name, r.uid, r.name).then(doneFeel).catch(() => {})} style={{ minHeight: 44 }} />
              </View>
            ))}
          </Section>
        ) : null}

        <Section title={t.friends.list} right={friends?.length ? <Text style={{ fontFamily: font.num, fontSize: 15, color: color.muted }}>{friends.length}</Text> : null}>
          {friends === null ? <Text style={{ fontFamily: font.body, fontSize: 13, color: color.muted }}>{t.friends.loading}</Text> : null}
          {error ? <Text style={{ fontFamily: font.body, fontSize: 13, color: "#F6B45A" }}>{t.friends.loadFailed}</Text> : null}
          {friends?.length === 0 && !error ? <Text style={{ fontFamily: font.body, fontSize: 13, lineHeight: 18, color: color.muted }}>{t.friends.empty}</Text> : null}
          {friends?.map((f) => {
            const c = f.card;
            const today = c?.today && c.today.date === c.active ? `${c.today.done}/${c.today.of}` : null;
            return (
              <Pressable key={f.uid} accessibilityRole="button" onPress={() => setOpen(f)}
                style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: color.line, opacity: pressed ? 0.7 : 1 })}>
                <View style={{ width: 44, alignItems: "center" }}>
                  <Text style={{ fontFamily: font.num, fontSize: 22, color: "#FFFFFF" }}>{c?.level ?? "–"}</Text>
                  <Text style={{ fontFamily: font.bold, fontSize: 9, letterSpacing: 1, color: color.muted }}>{t.status.lv}</Text>
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ fontFamily: font.bold, fontSize: 15, color: "#FFFFFF" }}>{c?.name ?? f.name}</Text>
                  <Text style={{ fontFamily: font.body, fontSize: 12, color: color.muted }}>
                    {[lastSeen(c), c?.streak != null ? fill(t.friends.streakShort, { n: c.streak }) : null, today ? fill(t.friends.todayShort, { x: today }) : null].filter(Boolean).join("  ·  ")}
                  </Text>
                </View>
                <Text style={{ fontFamily: font.bold, fontSize: 18, color: color.muted }}>›</Text>
              </Pressable>
            );
          })}
        </Section>

        <Section title={t.friends.add} sub={t.friends.addSub}>
          <View style={{ flexDirection: "row", gap: 8 }}>
            <TextInput value={input} onChangeText={(v) => { setInput(cleanCode(v)); setFound(null); }} autoCapitalize="characters" autoCorrect={false}
              placeholder="ABC123" placeholderTextColor="#4A5A7A" accessibilityLabel={t.friends.codeLabel} returnKeyType="search" onSubmitEditing={find}
              style={{ flex: 1, minWidth: 0, minHeight: 48, paddingHorizontal: 14, fontFamily: font.num, fontSize: 20, letterSpacing: 4, color: "#FFFFFF", borderWidth: 1, borderColor: "rgba(159,203,255,0.3)", backgroundColor: "rgba(5,10,24,0.7)" }} />
            <SysButton label={t.friends.find} disabled={busy || input.length < 6} onPress={find} style={{ minHeight: 48 }} />
          </View>
          {found?.uid ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
              <Text style={{ flex: 1, fontFamily: font.bold, fontSize: 15, color: "#FFFFFF" }}>{found.name}</Text>
              <SysButton label={t.friends.send} disabled={busy || full} onPress={send} style={{ minHeight: 44 }} />
            </View>
          ) : found ? <Text style={{ fontFamily: font.body, fontSize: 13, color: found === "sent" ? color.accent : color.muted }}>{msg[found]}</Text> : null}
          {full ? <Text style={{ fontFamily: font.body, fontSize: 12, color: color.muted }}>{fill(t.friends.full, { n: MAX_FRIENDS })}</Text> : null}
        </Section>

        <Section title={t.friends.yourCode} sub={t.friends.yourCodeSub}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <Text selectable accessibilityLabel={code ? code.split("").join(" ") : undefined}
              style={{ flex: 1, fontFamily: font.num, fontSize: 32, letterSpacing: 6, color: code ? "#FFFFFF" : color.muted }}>{code ?? "······"}</Text>
            <SysButton label={t.friends.share} disabled={!code} onPress={() => Share.share({ message: fill(t.friends.shareText, { code }) }).catch(() => {})} style={{ minHeight: 44 }} />
          </View>
        </Section>
      </ScrollView>
      {open ? <FriendPage friend={friends?.find((f) => f.uid === open.uid) ?? open} me={user.uid} myName={name} onClose={() => setOpen(null)} /> : null}
    </View>
  );
}
