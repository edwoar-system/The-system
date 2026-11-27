// Friends tab: your friend code, adding someone by code, requests, and your friends' cards.
import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Image, Modal, Pressable, ScrollView, Share, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { acceptRequest, declineRequest, findByCode, myCode, removeFriend, sendRequest, sendTroll, useFriends, useRequests, useSentTrolls } from "../lib/social";
import { activeAgo, cleanCode, MAX_FRIENDS, TROLLS, TROLL_LEVELS, nextTrollTitle, trollById, trollTitle, trollTitleForSender } from "../game/social";
import { RANKS } from "../game/ladders";
import { skillById } from "../game/guild";
import { doneFeel, lockFeel, tapFeel } from "../lib/haptics";
import StatShape from "./StatShape";
import StatInfo from "./StatInfo";
import NameText from "./NameText";
import PartySection from "./Party";
import { RankHex } from "./skillParts";
import { Coins, Frame, Glow, Label, SysButton } from "./sys";
import { useTheme } from "../theme";
import { SPONSOR_AMOUNTS, observerName, sponsorFriend, useObservers, watchFriend } from "../lib/observers";
import { shownTitle } from "../game/titles";
import { showSystem } from "../lib/popup";
import { t } from "../i18n";
import SwipeBack from "./SwipeBack";

const PARTIES_ON = false;

const fill = (s, vars) => Object.entries(vars ?? {}).reduce((acc, [k, v]) => acc.split(`{${k}}`).join(String(v)), String(s ?? ""));

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

// Pick a troll quest to send: choose how hard (you pay its coins), then one of that level or a surprise.
export function TrollPicker({ name, coins, onPick, onClose }) {
  const { color, font } = useTheme();
  const insets = useSafeAreaInsets();
  const [level, setLevel] = useState("easy");
  const cost = TROLL_LEVELS[level];
  const can = coins >= cost;
  const list = TROLLS.filter((x) => x.level === level && !x.legacy);
  return (
    <Modal animationType="slide" visible onRequestClose={onClose}>
      <SwipeBack onBack={onClose}>
      <View style={{ flex: 1, backgroundColor: color.bg }}>
        <ScrollView contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 30, paddingHorizontal: 14, maxWidth: 520, width: "100%", alignSelf: "center", gap: 10 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Pressable accessibilityRole="button" onPress={onClose} style={{ minHeight: 44, justifyContent: "center" }}>
              <Text style={{ fontFamily: font.bodyBold, fontSize: 14, color: color.accent }}>{`‹ ${t.friends.back}`}</Text>
            </Pressable>
            <Coins value={coins} size={18} />
          </View>
          <Text accessibilityRole="header" style={{ fontFamily: font.bold, fontSize: 24, color: "#FFFFFF" }}>{fill(t.troll.pickTitle, { name })}</Text>
          <Text style={{ fontFamily: font.body, fontSize: 13, lineHeight: 18, color: color.muted }}>{t.troll.pickSub}</Text>
          <View style={{ flexDirection: "row", gap: 6 }}>
            {Object.keys(TROLL_LEVELS).map((l) => {
              const on = level === l;
              return (
                <Pressable key={l} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => setLevel(l)}
                  style={{ flex: 1, minHeight: 56, alignItems: "center", justifyContent: "center", gap: 2, borderWidth: 1, borderColor: on ? color.frame : "rgba(159,203,255,0.22)", backgroundColor: on ? "rgba(159,203,255,0.16)" : "transparent" }}>
                  <Text style={{ fontFamily: font.bold, fontSize: 14, color: on ? "#FFFFFF" : color.muted }}>{t.troll.levels[l]}</Text>
                  <Coins value={TROLL_LEVELS[l]} size={13} />
                </Pressable>
              );
            })}
          </View>
          {!can ? <Text style={{ fontFamily: font.body, fontSize: 13, color: "#F6B45A" }}>{fill(t.troll.notEnough, { n: cost })}</Text> : null}
          <SysButton label={fill(t.troll.surprise, { n: cost })} disabled={!can} onPress={() => onPick(list[Math.floor(Math.random() * list.length)].id)} />
          <Frame cut={12} contentStyle={{ paddingHorizontal: 14, paddingVertical: 4 }}>
            {list.map((x, i) => (
              <Pressable key={x.id} accessibilityRole="button" disabled={!can} onPress={() => onPick(x.id)}
                style={({ pressed }) => ({ minHeight: 52, flexDirection: "row", alignItems: "center", gap: 12, borderTopWidth: i ? 1 : 0, borderTopColor: color.line, opacity: !can ? 0.4 : pressed ? 0.7 : 1 })}>
                <Text style={{ width: 34, fontFamily: font.bold, fontSize: 11, letterSpacing: 1, color: color.accent }}>{x.stat}</Text>
                <View style={{ flex: 1, gap: 2, paddingVertical: 6 }}>
                  <Text style={{ fontFamily: font.bodyMedium, fontSize: 15, color: "#FFFFFF" }}>{trollTitleForSender(x)}</Text>
                  {x.level === "hard" ? <Text style={{ fontFamily: font.body, fontSize: 12, color: color.muted }}>{x.place ? fill(t.troll.proofPlace, { place: t.troll.places[x.place] }) : t.troll.proofPhoto}</Text> : null}
                </View>
              </Pressable>
            ))}
          </Frame>
        </ScrollView>
      </View>
          </SwipeBack>
    </Modal>
  );
}

// Send troll quests (you pay), follow them, and work toward your troll title.
function TrollSection({ me, myName, myCoins, trollsDone, friend }) {
  const { color, font } = useTheme();
  const sent = useSentTrolls(me, friend.uid);
  const [picking, setPicking] = useState(false);
  const [error, setError] = useState(null);
  const name = friend.card?.name ?? friend.name;
  const title = trollTitle(trollsDone);
  const next = nextTrollTitle(trollsDone);
  async function pick(id) {
    setPicking(false);
    setError(null);
    try { await sendTroll(me, myName, friend.uid, name, id); doneFeel(); } catch (e) { setError(e.message === "no-coins" ? t.troll.noCoins : t.troll.failed); }
  }
  return (
    <Section title={t.troll.title} sub={fill(t.troll.sub, { name })}>
      <SysButton label={t.troll.send} onPress={() => setPicking(true)} />
      {error ? <Text style={{ fontFamily: font.body, fontSize: 13, color: "#F6B45A" }}>{error}</Text> : null}
      {sent.map((x) => (
        <View key={x.id} style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: color.line }}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={{ fontFamily: font.bodyMedium, fontSize: 14, color: "#FFFFFF" }}>{x.title ?? trollTitleForSender(trollById[x.troll]) ?? x.troll}</Text>
            <Text style={{ fontFamily: font.body, fontSize: 12, color: x.status === "done" ? color.accent : color.muted }}>{t.troll.status[x.status] ?? t.troll.status.new}</Text>
            {x.hasPhoto || x.place ? (
              <Text style={{ fontFamily: font.body, fontSize: 12, color: color.accent }}>
                {[x.hasPhoto ? t.troll.gotPhoto : null, x.place?.ok ? fill(t.troll.gotPlace, { place: x.place.name ?? t.troll.places[x.place.kind] }) : x.place?.skipped ? t.troll.placeSkipped : null].filter(Boolean).join("  ·  ")}
              </Text>
            ) : null}
          </View>
          {x.photo ? <Image source={{ uri: x.photo }} accessibilityLabel={t.troll.gotPhoto} style={{ width: 48, height: 48 }} /> : null}
          <Coins value={x.cost} sign="-" size={13} />
        </View>
      ))}
      <Text style={{ fontFamily: font.body, fontSize: 12, lineHeight: 17, color: color.muted }}>
        {title ? fill(t.troll.titleHave, { title: title.name, pct: Math.round(title.back * 100) }) : ""}
        {next ? `${title ? " " : ""}${fill(t.troll.titleNext, { title: next.name, n: next.at - trollsDone, pct: Math.round(next.back * 100) })}` : ""}
      </Text>
      {picking ? <TrollPicker name={name} coins={myCoins} onPick={pick} onClose={() => setPicking(false)} /> : null}
    </Section>
  );
}

// Sponsor a friend: some of your coins, sent under your title.
function SponsorSection({ me, myTitle, myCoins, friend }) {
  const { color } = useTheme();
  const [busy, setBusy] = useState(false);
  async function send(n) {
    setBusy(true);
    try {
      await sponsorFriend(me, myTitle, friend.uid, n);
      doneFeel();
      showSystem({ title: fill(t.observers.youSponsored, { name: friend.card?.name ?? friend.name, n }), lines: [fill(t.observers.asWho, { who: observerName(myTitle) })], tone: "buff" });
    } catch { showSystem({ title: t.observers.noCoins, tone: "debuff" }); } finally { setBusy(false); }
  }
  return (
    <Section title={t.observers.sponsorTitle} sub={fill(t.observers.sponsorSub, { who: observerName(myTitle) })}>
      <View style={{ flexDirection: "row", gap: 8 }}>
        {SPONSOR_AMOUNTS.map((n) => (
          <Pressable key={n} accessibilityRole="button" disabled={busy || myCoins < n} onPress={() => send(n)}
            style={({ pressed }) => ({ flex: 1, minHeight: 48, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: color.frame,
              backgroundColor: pressed ? "rgba(255,255,255,0.12)" : "transparent", opacity: myCoins < n ? 0.4 : 1 })}>
            <Coins value={n} size={16} />
          </Pressable>
        ))}
      </View>
    </Section>
  );
}

const agoText = (ms) => {
  const m = Math.max(0, Math.round((Date.now() - (ms ?? 0)) / 60000));
  return m < 60 ? fill(t.observers.minAgo, { n: m }) : m < 1440 ? fill(t.observers.hAgo, { n: Math.round(m / 60) }) : fill(t.observers.dAgo, { n: Math.round(m / 1440) });
};

// Who's been watching you: titles only; tap one to see who it is.
function ObserverList({ uid, friends }) {
  const { color, font } = useTheme();
  const list = useObservers(uid);
  const [shown, setShown] = useState({});
  if (!list?.length) return null;
  const nameOf = (from) => friends.find((f) => f.uid === from)?.name ?? t.observers.unknown;
  return (
    <Section title={t.observers.title} sub={t.observers.sub}>
      {list.slice(0, 8).map((e) => (
        <Pressable key={e.id} accessibilityRole="button" onPress={() => { tapFeel(); setShown((s) => ({ ...s, [e.id]: !s[e.id] })); }}
          style={{ minHeight: 48, justifyContent: "center", gap: 2, paddingTop: 8, borderTopWidth: 1, borderTopColor: color.line }}>
          <Text style={{ fontFamily: font.bodyMedium, fontSize: 13, lineHeight: 18, color: color.text }}>
            {`[${e.kind === "sponsor" ? fill(t.observers.sponsored, { who: observerName(e.title), n: e.amount }) : fill(t.observers.watching, { who: observerName(e.title) })}]`}
          </Text>
          <Text style={{ fontFamily: font.body, fontSize: 11, color: shown[e.id] ? color.accent : color.muted }}>
            {shown[e.id] ? fill(t.observers.itWas, { name: nameOf(e.from) }) : `${agoText(e.atMs)} · ${t.observers.tapToReveal}`}
          </Text>
        </Pressable>
      ))}
    </Section>
  );
}

// One friend, full screen.
export function FriendPage({ friend, me, myName, myTitle = null, myCoins = 0, trollsDone = 0, onClose }) {
  const { color, font } = useTheme();
  const insets = useSafeAreaInsets();
  const [info, setInfo] = useState(null);
  // Opening a profile = watching: they get "an observer is watching you" with your title (once a day).
  useEffect(() => { watchFriend(me, myTitle, friend.uid).catch(() => {}); }, [me, myTitle, friend.uid]);
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
      <SwipeBack onBack={onClose}>
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
                <NameText effect={c.nameEffect} style={{ fontFamily: font.displayHeavy, fontSize: 30, letterSpacing: 3, color: color.hi }}>{(c.name ?? friend.name).toUpperCase()}</NameText>
                {c.title ? <Text style={{ fontFamily: font.bold, fontSize: 13, letterSpacing: 2, color: color.gold }}>{c.title.toUpperCase()}</Text> : null}
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
                          <Text numberOfLines={2} style={{ textAlign: "center", fontFamily: font.bodyMedium, fontSize: 12, lineHeight: 16, color: color.text }}>{s.name ?? skillById[s.id]?.name ?? s.id}</Text>
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
          <SponsorSection me={me} myTitle={myTitle} myCoins={myCoins} friend={friend} />
          <TrollSection me={me} myName={myName} myCoins={myCoins} trollsDone={trollsDone} friend={friend} />
          <View style={{ marginTop: 30, marginHorizontal: 14 }}>
            <HoldButton label={t.friends.remove} tone="#F6B45A" onDone={() => { removeFriend(me, friend.uid).catch(() => {}); onClose(); }} />
          </View>
        </ScrollView>
      </View>
          </SwipeBack>
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

        {/* Party quests are switched off for now (they need the newest Firestore rules). Set PARTIES_ON to bring them back. */}
        {PARTIES_ON ? <PartySection user={user} player={player} friends={friends ?? []} /> : null}

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

        <ObserverList uid={user.uid} friends={friends ?? []} />

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
                  <NameText effect={c?.nameEffect} style={{ fontFamily: font.bold, fontSize: 15, color: "#FFFFFF" }}>{c?.name ?? f.name}</NameText>
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
      {open ? <FriendPage friend={friends?.find((f) => f.uid === open.uid) ?? open} me={user.uid} myName={name} myTitle={shownTitle(player)?.name ?? null} myCoins={player.coins ?? 0} trollsDone={player.trollsDone ?? 0} onClose={() => setOpen(null)} /> : null}
    </View>
  );
}
