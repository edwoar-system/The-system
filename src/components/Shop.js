// The shop: buy app time with coins (longer is cheaper per minute). Locked while a troll quest is open.
import { useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { APP_KINDS, LENGTHS, activeAppTime } from "../game/shop";
import { trollQueue } from "../game/social";
import { buyAppTime, endAppTime } from "../lib/shop";
import { useTrolls } from "../lib/social";
import { doneFeel } from "../lib/haptics";
import { Coins, Frame, Glow, Label, SysButton } from "./sys";
import { useTheme } from "../theme";
import { t } from "../i18n";

const fill = (s, vars) => Object.entries(vars).reduce((acc, [k, v]) => acc.split(`{${k}}`).join(String(v)), s);
export const leftText = (ms) => {
  const m = Math.max(0, Math.ceil(ms / 60000));
  return m >= 60 ? `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, "0")}m` : `${m} min`;
};

export default function Shop({ user, player, onClose }) {
  const { color, font } = useTheme();
  const insets = useSafeAreaInsets();
  const [kind, setKind] = useState("social");
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 15000); return () => clearInterval(id); }, []);
  const trollQ = trollQueue(useTrolls(user.uid));
  const locked = trollQ.active.length > 0;
  const coins = player.coins ?? 0;
  const active = activeAppTime(player, now);

  async function buy(l) {
    setBusy(true);
    setMsg(null);
    try {
      await buyAppTime(user.uid, kind, l.minutes, fill(t.shop.logTitle, { kind: t.shop.kinds[kind], min: l.minutes }));
      doneFeel();
      setMsg({ ok: true, text: fill(t.shop.bought, { min: l.minutes }) });
    } catch (e) {
      setMsg({ ok: false, text: e.message === "no-coins" ? t.shop.noCoins : t.shop.failed });
    } finally { setBusy(false); }
  }

  return (
    <Modal animationType="slide" visible onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: color.bg }}>
        <ScrollView contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 40, paddingHorizontal: 14, maxWidth: 520, width: "100%", alignSelf: "center", gap: 12 }}>
          <Glow height={380} at={0.18} />
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Pressable accessibilityRole="button" onPress={onClose} style={{ minHeight: 44, justifyContent: "center" }}>
              <Text style={{ fontFamily: font.bodyBold, fontSize: 14, color: color.accent }}>{`‹ ${t.shop.back}`}</Text>
            </Pressable>
            <Coins value={coins} size={22} />
          </View>
          <Text accessibilityRole="header" style={{ textAlign: "center", fontFamily: font.bold, fontSize: 26, color: "#FFFFFF" }}>{t.shop.title}</Text>

          {active ? (
            <Frame kind="premium" cut={12} contentStyle={{ padding: 16, gap: 6 }}>
              <Label tone={color.hi}>{t.shop.active}</Label>
              <Text style={{ fontFamily: font.bold, fontSize: 20, color: "#FFFFFF" }}>{fill(t.shop.activeLine, { kind: active.kind === "mixed" ? t.shop.mixed : t.shop.kinds[active.kind], left: leftText(active.end - now) })}</Text>
              <Pressable accessibilityRole="button" onPress={() => endAppTime(user.uid).catch(() => {})} style={{ minHeight: 40, justifyContent: "center", alignSelf: "flex-start" }}>
                <Text style={{ fontFamily: font.bodyBold, fontSize: 13, color: color.muted }}>{t.shop.endNow}</Text>
              </Pressable>
            </Frame>
          ) : null}

          {locked ? (
            <Frame cut={12} contentStyle={{ padding: 16, gap: 6 }} style={{ borderColor: "#F6B45A" }}>
              <Label tone="#F6B45A">{t.shop.locked}</Label>
              <Text style={{ fontFamily: font.body, fontSize: 14, lineHeight: 20, color: color.text }}>{t.shop.lockedText}</Text>
            </Frame>
          ) : (
            <Frame cut={12} contentStyle={{ padding: 16, gap: 12 }}>
              <View style={{ gap: 4 }}>
                <Label tone={color.hi}>{t.shop.appTitle}</Label>
                <Text style={{ fontFamily: font.body, fontSize: 13, lineHeight: 18, color: color.muted }}>{t.shop.appSub}</Text>
              </View>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                {APP_KINDS.map((k) => {
                  const on = kind === k;
                  return (
                    <Pressable key={k} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => setKind(k)}
                      style={{ minHeight: 44, paddingHorizontal: 12, justifyContent: "center", borderWidth: 1, borderColor: on ? color.frame : "rgba(159,203,255,0.22)", backgroundColor: on ? "rgba(159,203,255,0.16)" : "transparent" }}>
                      <Text style={{ fontFamily: font.bold, fontSize: 13, color: on ? "#FFFFFF" : color.muted }}>{t.shop.kinds[k]}</Text>
                    </Pressable>
                  );
                })}
              </View>
              {LENGTHS.map((l) => {
                const can = coins >= l.coins;
                const save = l.minutes - l.coins;
                return (
                  <View key={l.minutes} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: color.line }}>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={{ fontFamily: font.bold, fontSize: 17, color: "#FFFFFF" }}>{leftText(l.minutes * 60000)}</Text>
                      <Text style={{ fontFamily: font.body, fontSize: 12, color: color.muted }}>
                        {fill(t.shop.perMin, { p: (l.coins / l.minutes).toFixed(2) })}{save > 0 ? `  ·  ${fill(t.shop.saving, { n: save })}` : ""}
                      </Text>
                    </View>
                    <Coins value={l.coins} size={16} />
                    <SysButton label={can ? t.shop.buy : fill(t.shop.needMore, { n: l.coins - coins })} disabled={!can || busy} onPress={() => buy(l)} style={{ minHeight: 44, minWidth: 96 }} />
                  </View>
                );
              })}
              {msg ? <Text style={{ fontFamily: font.body, fontSize: 13, color: msg.ok ? color.accent : "#F6B45A" }}>{msg.text}</Text> : null}
              <Text style={{ fontFamily: font.body, fontSize: 12, lineHeight: 17, color: color.muted }}>{t.shop.honest}</Text>
            </Frame>
          )}

          <Frame cut={12} contentStyle={{ padding: 16, gap: 6 }}>
            <Label>{t.shop.later}</Label>
            <Text style={{ fontFamily: font.body, fontSize: 13, lineHeight: 19, color: color.muted }}>{t.shop.laterItems}</Text>
          </Frame>
        </ScrollView>
      </View>
    </Modal>
  );
}
