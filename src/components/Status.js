// Status: who you are in the System. Attribute hexagon, level, streak and your next main quest.
import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Pressable, ScrollView, Text, View } from "react-native";
import Svg, { Polygon, Defs, LinearGradient, Stop } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { setPlayerName, toggleFavQuote } from "../lib/player";
import { currentDay, currentStreak, getQuest } from "../lib/day";
import { levelFromXp, statValue } from "../game/economy";
import { STATS, todayKey } from "../game/quests";
import { Button, Field } from "./ui";
import { Coins, Frame, Glow, Label, hexPoints } from "./sys";
import StatShape from "./StatShape";
import Setup from "./Setup";
import { BodyCard } from "./Body";
import QuoteLibrary from "./QuoteLibrary";
import QuotePage from "./QuotePage";
import StatInfo from "./StatInfo";
import { HabitsCard } from "./Habits";
import Shop from "./Shop";
import NameText from "./NameText";
import { trollTitle } from "../game/social";
import { FeedbackButton } from "./Feedback";
import { quoteOfDay } from "../game/quotes";
import { PARTS, partsDone } from "../game/profile";
import { useTheme } from "../theme";
import { t } from "../i18n";
import { spendStatPoint } from "../lib/level";
import { tapFeel } from "../lib/haptics";

const fill = (s, vars) => Object.entries(vars ?? {}).reduce((acc, [k, v]) => acc.split(`{${k}}`).join(String(v)), String(s ?? ""));

function useCountUp(duration = 1400) {
  const v = useRef(new Animated.Value(0)).current;
  const [k, setK] = useState(0);
  useEffect(() => {
    const id = v.addListener(({ value }) => setK(value));
    Animated.timing(v, { toValue: 1, duration, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
    return () => v.removeListener(id);
  }, [v, duration]);
  return k;
}

function LevelBadge({ level }) {
  const { color, font } = useTheme();
  return (
    <View style={{ width: 58, height: 64, alignItems: "center", justifyContent: "center" }}>
      <Svg width={58} height={64} style={{ position: "absolute" }}>
        <Defs>
          <LinearGradient id="lvEdge" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#EAF4FF" />
            <Stop offset="0.4" stopColor={color.purple} />
            <Stop offset="1" stopColor={color.blue} />
          </LinearGradient>
        </Defs>
        <Polygon points={hexPoints(58, 64, 1.5)} fill={color.surface} stroke="url(#lvEdge)" strokeWidth={2} />
        <Polygon points={hexPoints(58, 64, 8)} fill="none" stroke={color.accent} strokeOpacity={0.3} strokeWidth={1} />
      </Svg>
      <Text style={{ fontFamily: font.bold, fontSize: 9, letterSpacing: 2, color: color.muted, marginTop: 2 }}>{t.status.lv}</Text>
      <Text style={{ fontFamily: font.num, fontSize: 28, lineHeight: 30, color: color.hi }}>{level}</Text>
    </View>
  );
}

function ExpBar({ ratio }) {
  const { color } = useTheme();
  return (
    <View style={{ height: 12, backgroundColor: color.surface, borderWidth: 1, borderColor: "rgba(150,200,255,0.3)", overflow: "hidden" }}>
      <View style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${Math.max(ratio * 100, 1.5)}%`, flexDirection: "row" }}>
        <Svg width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 100 10" style={{ position: "absolute" }}>
          <Defs>
            <LinearGradient id="expFill" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor={color.blue} />
              <Stop offset="1" stopColor={color.purple} />
            </LinearGradient>
          </Defs>
          <Polygon points="0,0 100,0 100,10 0,10" fill="url(#expFill)" />
        </Svg>
        <View style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 3, backgroundColor: "#FFFFFF" }} />
      </View>
      <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, flexDirection: "row" }}>
        {Array.from({ length: 10 }, (_, i) => (
          <View key={i} style={{ flex: 1, borderRightWidth: i < 9 ? 2 : 0, borderRightColor: "rgba(0,0,0,0.55)" }} />
        ))}
      </View>
    </View>
  );
}

function QuoteCard({ quote, onOpen, onNext, onLibrary }) {
  const { color, font } = useTheme();
  return (
    <View style={{ marginTop: 20, marginHorizontal: 18, paddingLeft: 14, borderLeftWidth: 2, borderLeftColor: color.frame, gap: 6 }}>
      <Label tone={color.hi}>{t.quote.title}</Label>
      <Pressable accessibilityRole="button" accessibilityHint={t.quote.openHint} onPress={onOpen} style={({ pressed }) => ({ gap: 6, opacity: pressed ? 0.7 : 1 })}>
        <Text style={{ fontFamily: font.bodyMedium, fontSize: 16, lineHeight: 23, color: "#FFFFFF" }}>{quote.text}</Text>
        <Text style={{ fontFamily: font.body, fontSize: 12, color: color.muted }}>{quote.who === quote.work ? quote.who : `${quote.who}, ${quote.work}`}</Text>
      </Pressable>
      <View style={{ flexDirection: "row", gap: 18 }}>
        <Pressable accessibilityRole="button" onPress={onNext} style={{ minHeight: 40, justifyContent: "center" }}>
          <Text style={{ fontFamily: font.bodyBold, fontSize: 13, color: color.accent }}>{t.quote.another}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={onOpen} style={{ minHeight: 40, justifyContent: "center" }}>
          <Text style={{ fontFamily: font.bodyBold, fontSize: 13, color: color.accent }}>{t.quote.more}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={onLibrary} style={{ minHeight: 40, justifyContent: "center" }}>
          <Text style={{ fontFamily: font.bodyBold, fontSize: 13, color: color.accent }}>{t.quote.all}</Text>
        </Pressable>
      </View>
    </View>
  );
}

// A small nudge to the questionnaire, until most of it is answered.
function TunePrompt({ profile, onPress }) {
  const { color, font } = useTheme();
  const done = partsDone(profile);
  const n = PARTS.filter((p) => done[p]).length;
  if (n >= PARTS.length - 1) return null;
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => ({ marginTop: 12, marginHorizontal: 14, opacity: pressed ? 0.8 : 1 })}>
      <Frame cut={12} contentStyle={{ padding: 14, flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={{ fontFamily: font.bold, fontSize: 15, color: "#FFFFFF" }}>{t.tune.promptTitle}</Text>
          <Text style={{ fontFamily: font.body, fontSize: 12, lineHeight: 17, color: color.muted }}>{fill(t.tune.prompt, { n, of: PARTS.length })}</Text>
        </View>
        <Text style={{ fontFamily: font.bold, fontSize: 18, color: color.muted }}>›</Text>
      </Frame>
    </Pressable>
  );
}

export default function Status({ user, player, error, onOpenQuests, onOpenSettings }) {
  const { color, font } = useTheme();
  const insets = useSafeAreaInsets();
  const [nameDraft, setNameDraft] = useState("");
  const [locking, setLocking] = useState(false);
  const [quoteShift, setQuoteShift] = useState(0);
  const [library, setLibrary] = useState(false);
  const [info, setInfo] = useState(null); // a stat to explain
  const [quotePage, setQuotePage] = useState(false);
  const [shop, setShop] = useState(false);
  const k = useCountUp();

  if (error) {
    return <View style={{ flex: 1, backgroundColor: color.bg, padding: 24, paddingTop: insets.top + 40 }}>
      <Text style={{ fontFamily: font.bodyMedium, color: color.danger }}>{t.home.dbError} ({error})</Text>
    </View>;
  }
  if (!player) {
    return <View style={{ flex: 1, backgroundColor: color.bg, padding: 24, paddingTop: insets.top + 40 }}>
      <Text style={{ fontFamily: font.body, color: color.muted }}>{t.home.loading}</Text>
    </View>;
  }

  const lvl = levelFromXp(player.xp ?? 0);
  const favs = player.favQuotes ?? [];
  const quote = quoteOfDay(todayKey(), quoteShift, player.profile?.schools, favs);
  const star = (id) => toggleFavQuote(user.uid, id, !favs.includes(id)).catch(() => {});
  const day = currentDay(player, user.uid);
  const stats = Object.fromEntries(STATS.map((s) => [s, statValue(player.statXp?.[s] ?? 0)]));
  const next = day.mains.find((m) => !m.done);
  const nextQ = next ? getQuest(next.id) : null;
  const mainsDone = day.mains.filter((m) => m.done).length;
  const n = (v) => Math.round(v * k);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: color.bg }}
      contentContainerStyle={{ paddingTop: insets.top + 14, paddingBottom: 40, maxWidth: 520, width: "100%", alignSelf: "center" }}>
      <Glow height={560} at={0.22} />

      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 18 }}>
        <Label tone={color.hi} style={{ letterSpacing: 5, fontSize: 12 }}>{t.status.system}</Label>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
          <FeedbackButton user={user} player={player} />
          <Pressable accessibilityRole="button" accessibilityLabel={`${t.shop.open}, ${player.coins ?? 0}`} onPress={() => setShop(true)} hitSlop={6}
            style={({ pressed }) => ({ minHeight: 44, flexDirection: "row", alignItems: "center", gap: 8, paddingLeft: 10, paddingRight: 4, borderWidth: 1, borderColor: "rgba(242,201,76,0.35)", opacity: pressed ? 0.7 : 1 })}>
            <Coins value={n(player.coins ?? 0)} size={18} />
            <Text style={{ fontFamily: font.bold, fontSize: 11, letterSpacing: 1, color: color.muted }}>{t.shop.open.toUpperCase()} ›</Text>
          </Pressable>
        </View>
      </View>

      {/* New players: name and System setup come first, before anything else. */}
      {!player.name ? (
        <Frame style={{ marginTop: 12, marginHorizontal: 14 }} contentStyle={{ padding: 16, gap: 12 }}>
          <Label tone={color.hi}>{t.home.setName}</Label>
          <Field label={t.login.name} value={nameDraft} onChangeText={setNameDraft} autoCapitalize="words" />
          <Button label={t.home.saveName} disabled={!nameDraft.trim()} onPress={() => setPlayerName(user.uid, nameDraft.trim())} />
        </Frame>
      ) : null}

      {!player.setupLocked || locking ? (
        <Setup user={user} player={player} onLocking={() => setLocking(true)} onDone={() => setLocking(false)} />
      ) : null}
      <StatShape values={stats} onStat={setInfo} />
      {(player.statPoints ?? 0) > 0 ? (
        <Frame kind="premium" cut={14} style={{ marginTop: 12, marginHorizontal: 14 }} contentStyle={{ padding: 14, gap: 10 }}>
          <Label tone={color.purple}>{fill(t.levelUp.spendTitle, { n: player.statPoints })}</Label>
          <Text style={{ fontFamily: font.body, fontSize: 12, lineHeight: 17, color: color.muted }}>{t.levelUp.spendSub}</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            {STATS.map((st) => (
              <Pressable key={st} accessibilityRole="button" accessibilityLabel={`+1 ${t.stats[st]}`} onPress={() => { tapFeel(); spendStatPoint(user.uid, st).catch(() => {}); }}
                style={({ pressed }) => ({ minWidth: 96, flexGrow: 1, minHeight: 46, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 12, borderWidth: 1,
                  borderColor: color.purple, backgroundColor: pressed ? "rgba(168,126,255,0.28)" : "rgba(168,126,255,0.08)" })}>
                <Text style={{ fontFamily: font.bold, fontSize: 13, color: "#FFFFFF" }}>{`${st} ${stats[st]}`}</Text>
                <Text style={{ fontFamily: font.bold, fontSize: 18, color: color.purple }}>+</Text>
              </Pressable>
            ))}
          </View>
        </Frame>
      ) : null}
      <StatInfo stat={info} value={info ? stats[info] : null} onClose={() => setInfo(null)} />

      <View style={{ alignItems: "center", gap: 2, marginTop: 10 }}>
        <Label>{t.status.player}</Label>
        <NameText effect={player.nameEffect} style={{ fontFamily: font.displayHeavy, fontSize: 32, letterSpacing: 3, color: color.hi }}>
          {(player.name || t.home.defaultName).toUpperCase()}
        </NameText>
        {trollTitle(player.trollsDone ?? 0) ? (
          <Text style={{ fontFamily: font.bold, fontSize: 13, letterSpacing: 2, color: color.gold }}>{trollTitle(player.trollsDone ?? 0).name.toUpperCase()}</Text>
        ) : null}
      </View>

      <View style={{ flexDirection: "row", alignItems: "center", gap: 14, marginTop: 18, paddingHorizontal: 18 }}>
        <LevelBadge level={lvl.level} />
        <View style={{ flex: 1, gap: 7 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
            <Label tone={color.hi} style={{ letterSpacing: 2, fontSize: 12 }}>{t.status.exp}</Label>
            <Text style={{ fontFamily: font.num, fontSize: 17, color: color.text }}>
              {n(lvl.xpIntoLevel)}<Text style={{ fontSize: 13, color: color.muted }}> / {lvl.xpForLevel}</Text>
            </Text>
          </View>
          <ExpBar ratio={(lvl.xpIntoLevel / lvl.xpForLevel) * k} />
          <Text style={{ fontFamily: font.body, fontSize: 12, color: color.muted }}>
            <Text style={{ fontFamily: font.num, fontSize: 14, color: color.text }}>{lvl.xpForLevel - lvl.xpIntoLevel} </Text>
            {fill(t.status.toNext, { level: lvl.level + 1 })}
          </Text>
        </View>
      </View>

      <View style={{ flexDirection: "row", gap: 22, marginTop: 14, paddingHorizontal: 18 }}>
        <Text style={{ fontFamily: font.body, fontSize: 13, color: color.muted }}>
          {t.status.streak} <Text style={{ fontFamily: font.num, fontSize: 17, color: color.text }}>{currentStreak(player)}</Text> {t.status.days}
        </Text>
        <Text style={{ fontFamily: font.body, fontSize: 13, color: color.muted }}>
          {t.status.mainsToday} <Text style={{ fontFamily: font.num, fontSize: 17, color: color.text }}>{mainsDone}/{day.mains.length}</Text>
        </Text>
      </View>

      <QuoteCard quote={quote} onOpen={() => setQuotePage(true)} onNext={() => setQuoteShift((n) => n + 1)} onLibrary={() => setLibrary(true)} />
      {library ? <QuoteLibrary mine={player.profile?.schools ?? []} favs={favs} onStar={star} onClose={() => setLibrary(false)} /> : null}
      {shop ? <Shop user={user} player={player} onClose={() => setShop(false)} /> : null}
      {quotePage ? <QuotePage quote={quote} starred={favs.includes(quote.id)} onStar={() => star(quote.id)} onClose={() => setQuotePage(false)} /> : null}

      <Pressable accessibilityRole="button" onPress={onOpenQuests} style={({ pressed }) => ({ marginTop: 22, marginHorizontal: 14, transform: [{ scale: pressed ? 0.99 : 1 }] })}>
        <Frame kind="premium" cut={16} contentStyle={{ padding: 16, flexDirection: "row", alignItems: "center", gap: 14 }}>
          {nextQ ? (
            <>
              <View style={{ flex: 1, gap: 3 }}>
                <Label tone={color.hi} style={{ letterSpacing: 2 }}>{t.status.nextMain}</Label>
                <Text style={{ fontFamily: font.bold, fontSize: 18, color: "#FFFFFF" }}>{nextQ.title}</Text>
                <Text style={{ fontFamily: font.body, fontSize: 13, color: color.muted }}>
                  {fill(t.status.nextMainSub, { stat: nextQ.stat, min: nextQ.minutes })}
                </Text>
              </View>
            </>
          ) : (
            <View style={{ flex: 1, gap: 3 }}>
              <Label tone={color.reward} style={{ letterSpacing: 2 }}>{t.status.allDone}</Label>
              <Text style={{ fontFamily: font.body, fontSize: 13, color: color.muted }}>{t.status.allDoneSub}</Text>
            </View>
          )}
        </Frame>
      </Pressable>

      <HabitsCard user={user} player={player} />
      <BodyCard user={user} player={player} />

      {player.setupLocked && onOpenSettings ? <TunePrompt profile={player.profile} onPress={onOpenSettings} /> : null}

    </ScrollView>
  );
}
