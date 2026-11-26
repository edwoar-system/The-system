// The quest-clear window, Solo Leveling style: a line of light opens into a System window, the header flickers in,
// the rewards count up, and if loot dropped it pops out after a beat with its rarity glow.
// Tap anywhere to close; it also closes by itself. What comes next (level up, rank up, body report) waits for it.
import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Pressable, Text, View } from "react-native";
import { onClear } from "../lib/popup";
import { clearFeel, lootFeel } from "../lib/haptics";
import { CoinMark, nativeDriver } from "./sys";
import { useTheme } from "../theme";
import { t } from "../i18n";

const fill = (s, vars) => Object.entries(vars ?? {}).reduce((acc, [k, v]) => acc.split(`{${k}}`).join(String(v)), String(s ?? ""));

const OPEN_MS = 220;
const COUNT_MS = 800;
const LOOT_AT = 1100;

export default function QuestClear() {
  const { color, font } = useTheme();
  const [msg, setMsg] = useState(null);
  const [n, setN] = useState(0); // 0 → 1 while the numbers count up
  const [lootOn, setLootOn] = useState(false);
  const wide = useRef(new Animated.Value(0)).current;
  const tall = useRef(new Animated.Value(0)).current;
  const head = useRef(new Animated.Value(0)).current;
  const pop = useRef(new Animated.Value(0)).current;
  const dim = useRef(new Animated.Value(0)).current;
  const timers = useRef([]);
  const current = useRef(null);

  const RARITY = { common: color.accent, rare: color.purple, epic: color.reward, legendary: color.reward };

  function clearTimers() { timers.current.forEach((x) => clearTimeout(x)); timers.current = []; }
  const later = (ms, f) => timers.current.push(setTimeout(f, ms));

  useEffect(() => onClear((m) => {
    // A new clear while one is open: finish the old one first (so its follow-ups still run).
    if (current.current) current.current.then?.();
    clearTimers();
    current.current = m;
    setMsg(m);
    setN(0);
    setLootOn(false);
    [wide, tall, head, pop, dim].forEach((v) => v.setValue(0));
    clearFeel();
    Animated.parallel([
      Animated.timing(dim, { toValue: 1, duration: 200, useNativeDriver: nativeDriver }),
      Animated.sequence([
        Animated.timing(wide, { toValue: 1, duration: OPEN_MS, easing: Easing.out(Easing.cubic), useNativeDriver: nativeDriver }),
        Animated.timing(tall, { toValue: 1, duration: 180, easing: Easing.out(Easing.back(1.4)), useNativeDriver: nativeDriver }),
        // The header flickers in like a screen catching signal.
        Animated.sequence([0.9, 0.15, 1, 0.4, 1].map((v, i) => Animated.timing(head, { toValue: v, duration: i === 4 ? 120 : 45, useNativeDriver: nativeDriver }))),
      ]),
    ]).start();
    // Count the rewards up.
    const start = Date.now() + OPEN_MS + 200;
    const tick = () => {
      const f = Math.max(0, Math.min(1, (Date.now() - start) / COUNT_MS));
      setN(1 - (1 - f) ** 3);
      if (f < 1) later(32, tick);
    };
    later(OPEN_MS + 200, tick);
    if (m.loot) {
      later(LOOT_AT, () => {
        setLootOn(true);
        lootFeel(m.loot.rarity !== "common");
        Animated.spring(pop, { toValue: 1, friction: 5, tension: 120, useNativeDriver: nativeDriver }).start();
      });
    }
    later(m.loot ? 5600 : 3400, close);
  }), []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => clearTimers(), []);

  function close() {
    clearTimers();
    const m = current.current;
    current.current = null;
    Animated.parallel([
      Animated.timing(dim, { toValue: 0, duration: 200, useNativeDriver: nativeDriver }),
      Animated.timing(tall, { toValue: 0, duration: 160, useNativeDriver: nativeDriver }),
    ]).start(() => { setMsg(null); m?.then?.(); });
  }

  if (!msg) return null;
  const coins = msg.coins ?? 0;
  const xp = msg.xp ?? 0;
  const loot = msg.loot;
  const tone = loot && lootOn ? RARITY[loot.rarity] : color.accent;
  const header = msg.morningFull ? t.clear.morningHeader : msg.allClear ? t.clear.allHeader : t.clear.header;
  return (
    <Animated.View style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, zIndex: 60, opacity: dim }}>
      <Pressable accessibilityRole="button" accessibilityLabel={`${header}. ${msg.title ?? ""}. ${t.clear.tap}`} onPress={close}
        style={{ flex: 1, backgroundColor: "rgba(1,4,10,0.62)", alignItems: "center", justifyContent: "center", paddingHorizontal: 20 }}>
        <Animated.View style={{ width: "100%", maxWidth: 400, transform: [{ scaleX: wide.interpolate({ inputRange: [0, 1], outputRange: [0.04, 1] }) }, { scaleY: tall.interpolate({ inputRange: [0, 1], outputRange: [0.03, 1] }) }],
          borderWidth: 1, borderColor: tone, backgroundColor: "rgba(4,10,24,0.97)", paddingVertical: 18, paddingHorizontal: 18, gap: 12,
          shadowColor: tone, shadowOpacity: 0.75, shadowRadius: 26, shadowOffset: { width: 0, height: 0 } }}>
          {/* Corner marks, like the System's windows */}
          {[{ top: -1, left: -1 }, { top: -1, right: -1 }, { bottom: -1, left: -1 }, { bottom: -1, right: -1 }].map((pos, i) => (
            <View key={i} style={{ position: "absolute", width: 14, height: 14, ...pos, borderColor: "#FFFFFF",
              borderTopWidth: pos.top != null ? 2 : 0, borderBottomWidth: pos.bottom != null ? 2 : 0, borderLeftWidth: pos.left != null ? 2 : 0, borderRightWidth: pos.right != null ? 2 : 0 }} />
          ))}
          <Animated.Text style={{ opacity: head, fontFamily: font.bold, fontSize: 12, letterSpacing: 4, color: msg.allClear ? color.purple : color.accent, textAlign: "center" }}>
            {`[ ${header} ]`}
          </Animated.Text>
          {msg.title ? <Text style={{ fontFamily: font.bold, fontSize: 19, lineHeight: 24, color: "#FFFFFF", textAlign: "center" }}>{msg.title}</Text> : null}

          <View style={{ height: 1, backgroundColor: "rgba(159,203,255,0.25)" }} />
          <Text style={{ fontFamily: font.bold, fontSize: 11, letterSpacing: 3, color: color.muted }}>{t.clear.rewards}</Text>
          <View style={{ flexDirection: "row", justifyContent: "space-around", alignItems: "center" }}>
            {coins ? (
              <View style={{ alignItems: "center", gap: 2 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Text style={{ fontFamily: font.num, fontSize: 30, color: color.reward, fontVariant: ["tabular-nums"] }}>{`+${Math.round(coins * n)}`}</Text>
                  <CoinMark size={24} />
                </View>
                <Text style={{ fontFamily: font.body, fontSize: 12, color: color.muted }}>{msg.bonus ? fill(t.clear.withBonus, { n: msg.bonus }) : t.clear.coins}</Text>
              </View>
            ) : null}
            <View style={{ alignItems: "center", gap: 2 }}>
              <Text style={{ fontFamily: font.num, fontSize: 30, color: color.accent, fontVariant: ["tabular-nums"] }}>{`+${Math.round(xp * n)}`}</Text>
              <Text style={{ fontFamily: font.body, fontSize: 12, color: color.muted }}>{t.clear.exp}</Text>
            </View>
          </View>
          {msg.allClear && msg.streak ? (
            <Text style={{ fontFamily: font.bold, fontSize: 14, letterSpacing: 1, color: color.purple, textAlign: "center" }}>{fill(t.clear.streak, { n: msg.streak })}</Text>
          ) : null}

          {loot && lootOn ? (
            <Animated.View style={{ transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }], opacity: pop.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 1, 1] }),
              borderWidth: 1, borderColor: tone, backgroundColor: "rgba(10,16,34,0.95)", paddingVertical: 12, paddingHorizontal: 14, gap: 4, alignItems: "center",
              shadowColor: tone, shadowOpacity: 0.9, shadowRadius: 18, shadowOffset: { width: 0, height: 0 } }}>
              <Text style={{ fontFamily: font.bold, fontSize: 11, letterSpacing: 3, color: tone }}>{`${t.clear.dropped} · ${t.clear.rarity[loot.rarity]}`}</Text>
              <Text style={{ fontFamily: font.bold, fontSize: 18, color: "#FFFFFF" }}>{t.clear.loot[loot.kind]}</Text>
              <Text style={{ fontFamily: font.bodyMedium, fontSize: 14, color: loot.coins ? color.reward : color.text }}>{fill(t.clear.lootLine[loot.kind], { coins: loot.coins, xp: loot.xp })}</Text>
            </Animated.View>
          ) : null}
          <Text style={{ fontFamily: font.body, fontSize: 11, color: color.muted, textAlign: "center" }}>{t.clear.tap}</Text>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}
