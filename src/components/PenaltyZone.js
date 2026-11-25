// Penalty Zone: the cutscene when you enter, the timer, and the redemption quest. Black with red accents only.
import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Modal, Pressable, ScrollView, Text, View } from "react-native";
import Svg, { Path, Polygon, Rect, Line } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { REDEMPTIONS, redemptionById, redemptionTitle } from "../game/penalty";
import { questById } from "../game/quests";
import { chooseRedemption, finishRedemption, markPenaltySeen } from "../lib/penalty";
import { Label, SysButton, hexPoints } from "./sys";
import { useTheme } from "../theme";
import { t } from "../i18n";

const RED = "#FF2E45";
const fill = (s, vars) => Object.entries(vars ?? {}).reduce((acc, [k, v]) => acc.split(`{${k}}`).join(String(v)), String(s ?? ""));
const hms = (ms) => { const s = Math.max(0, Math.floor(ms / 1000)); return [Math.floor(s / 3600), Math.floor(s / 60) % 60, s % 60].map((x) => String(x).padStart(2, "0")).join(":"); };

export function usePenaltyClock() {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, []);
  return now;
}

// The red strip shown above every tab while you are in the zone.
export function PenaltyBar({ player, onOpen }) {
  const { font } = useTheme();
  const now = usePenaltyClock();
  return (
    <Pressable accessibilityRole="button" onPress={onOpen}
      style={{ paddingTop: 10, paddingBottom: 10, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", gap: 10,
        backgroundColor: "rgba(255,46,69,0.14)", borderTopWidth: 1, borderTopColor: "rgba(255,90,107,0.5)" }}>
      <View style={{ width: 7, height: 7, backgroundColor: RED, transform: [{ rotate: "45deg" }] }} />
      <Text style={{ fontFamily: font.bold, fontSize: 12, letterSpacing: 3, color: "#FF5A6B" }}>{t.penalty.bar}</Text>
      <Text style={{ flex: 1, fontFamily: font.num, fontSize: 18, color: "#FF3B4F", fontVariant: ["tabular-nums"] }}>{hms(player.penalty.until - now)}</Text>
      <Text style={{ fontFamily: font.bodyBold, fontSize: 13, color: "#FFD0D5" }}>{t.penalty.barOpen}</Text>
    </Pressable>
  );
}

export default function PenaltyZone({ user, player, onClose, intro }) {
  const { color, font } = useTheme();
  const insets = useSafeAreaInsets();
  const now = usePenaltyClock();
  const a = useRef(new Animated.Value(intro ? 0 : 1)).current;
  const [busy, setBusy] = useState(false);
  const [freed, setFreed] = useState(false);
  const p = player.penalty;

  useEffect(() => {
    if (!intro) return;
    Animated.timing(a, { toValue: 1, duration: 4200, easing: Easing.linear, useNativeDriver: false }).start();
    markPenaltySeen(user.uid).catch(() => {});
  }, [intro, a, user.uid]);

  const at = (s, e) => a.interpolate({ inputRange: [0, s / 4.2, e / 4.2, 1], outputRange: [0, 0, 1, 1], extrapolate: "clamp" });
  const slam = a.interpolate({ inputRange: [0, 2.1 / 4.2, 2.4 / 4.2, 1], outputRange: [1.6, 1.6, 1, 1], extrapolate: "clamp" });
  const shake = a.interpolate({ inputRange: [0, 2.1 / 4.2, 2.2 / 4.2, 2.3 / 4.2, 2.4 / 4.2, 2.5 / 4.2, 1], outputRange: [0, 0, 8, -6, 4, 0, 0], extrapolate: "clamp" });
  const flash = a.interpolate({ inputRange: [0, 2.1 / 4.2, 2.15 / 4.2, 2.6 / 4.2, 1], outputRange: [0, 0, 0.35, 0, 0], extrapolate: "clamp" });
  const lineW = a.interpolate({ inputRange: [0, 0.1 / 4.2, 0.7 / 4.2, 1], outputRange: [0, 0, 300, 300], extrapolate: "clamp" });

  if (!p) return null;
  const missedTitle = p.missed?.length === 1 ? fill(t.penalty.failed, { title: questById[p.missed[0]]?.title ?? "" }) : fill(t.penalty.failedMany, { n: p.missed?.length ?? 0 });
  const u = new Date(p.until);
  const untilText = `${String(u.getHours()).padStart(2, "0")}:${String(u.getMinutes()).padStart(2, "0")}`;
  const chosen = p.redemption ? redemptionById[p.redemption] : null;
  const act = async (fn, after) => { setBusy(true); try { await fn(); after?.(); } catch (e) { /* stays as is */ } finally { setBusy(false); } };

  return (
    <Modal transparent animationType="fade" visible onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "#030103" }}>
        <Animated.View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, backgroundColor: RED, opacity: flash }} />
        <ScrollView contentContainerStyle={{ paddingTop: insets.top + 14, paddingBottom: insets.bottom + 30, paddingHorizontal: 18, maxWidth: 520, width: "100%", alignSelf: "center" }}>
          <Animated.View style={{ transform: [{ translateX: shake }] }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Label tone="#FF5A6B" style={{ letterSpacing: 5, fontSize: 12 }}>{t.status.system}</Label>
              <Pressable accessibilityRole="button" onPress={onClose} hitSlop={8} style={{ minHeight: 40, justifyContent: "center", paddingHorizontal: 12, borderWidth: 1, borderColor: "rgba(255,90,107,0.35)" }}>
                <Text style={{ fontFamily: font.bodyBold, fontSize: 12, letterSpacing: 1, color: "#E0A3AA" }}>{t.penalty.close.toUpperCase()}</Text>
              </Pressable>
            </View>

            {freed ? (
              <View style={{ alignItems: "center", gap: 12, marginTop: 120 }}>
                <Label tone="#FFFFFF" style={{ letterSpacing: 5, fontSize: 14 }}>{t.penalty.freed}</Label>
                <Text style={{ fontFamily: font.body, fontSize: 15, color: "#C9A9AE" }}>{t.penalty.freedSub}</Text>
                <SysButton label={t.urgent.ok} onPress={onClose} style={{ alignSelf: "stretch", marginTop: 24 }} />
              </View>
            ) : (
              <>
                <Animated.View style={{ marginTop: 26, height: 1, width: lineW, alignSelf: "center", backgroundColor: RED }} />
                <Animated.Text style={{ marginTop: 12, textAlign: "center", fontFamily: font.bold, fontSize: 12, letterSpacing: 6, color: RED, opacity: at(0.4, 0.6) }}>{t.penalty.warning}</Animated.Text>
                <Animated.Text style={{ marginTop: 8, textAlign: "center", fontFamily: font.body, fontSize: 14, color: "#C9A9AE", opacity: at(0.9, 1.6) }}>{missedTitle}</Animated.Text>
                <Animated.Text style={{ marginTop: 22, textAlign: "center", fontFamily: font.bold, fontSize: 12, letterSpacing: 4, color: "#A28C90", opacity: at(1.8, 2.2) }}>{t.penalty.entered}</Animated.Text>
                <Animated.Text style={{ marginTop: 4, textAlign: "center", fontFamily: font.displayHeavy, fontSize: 40, letterSpacing: 3, color: "#FFFFFF", opacity: at(2.1, 2.2), transform: [{ scale: slam }] }}>{t.penalty.zone}</Animated.Text>

                <Animated.View style={{ marginTop: 18, alignSelf: "center", opacity: at(2.5, 2.8) }}>
                  <Svg width={140} height={150}>
                    <Polygon points={hexPoints(140, 150, 2)} fill="rgba(40,4,10,0.9)" stroke={RED} strokeWidth={2} />
                    <Rect x={53} y={70} width={34} height={28} fill="none" stroke="#FFFFFF" strokeWidth={2.4} />
                    <Path d="M59 70 v-9 a11 11 0 0 1 22 0 v9" fill="none" stroke="#FFFFFF" strokeWidth={2.4} />
                    <Line x1={70} y1={80} x2={70} y2={89} stroke={RED} strokeWidth={2.4} />
                  </Svg>
                </Animated.View>

                <Animated.View style={{ alignItems: "center", marginTop: 14, opacity: at(3.1, 3.4) }}>
                  <Label tone="#A28C90" style={{ letterSpacing: 4 }}>{fill(t.penalty.sealedUntil, { time: untilText })}</Label>
                  <Text style={{ fontFamily: font.num, fontSize: 54, letterSpacing: 2, color: "#FF3B4F", fontVariant: ["tabular-nums"] }}>{hms(p.until - now)}</Text>
                </Animated.View>

                <Animated.View style={{ marginTop: 14, opacity: at(3.4, 3.8), borderTopWidth: 1, borderTopColor: "rgba(255,90,107,0.25)" }}>
                  {[
                    [t.penalty.reason, p.missed?.length === 1 ? questById[p.missed[0]]?.title : `${p.missed?.length} main quests`],
                    [t.penalty.unlocks, t.penalty.sealedSoon],
                    [t.penalty.normal, t.penalty.normalValue],
                  ].map(([k, v]) => (
                    <View key={k} style={{ flexDirection: "row", justifyContent: "space-between", gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "rgba(255,90,107,0.12)" }}>
                      <Text style={{ fontFamily: font.body, fontSize: 14, color: "#C9A9AE" }}>{k}</Text>
                      <Text style={{ flexShrink: 1, textAlign: "right", fontFamily: font.bodyMedium, fontSize: 14, color: "#F4E9EA" }}>{v}</Text>
                    </View>
                  ))}
                </Animated.View>

                <Animated.View style={{ marginTop: 18, opacity: at(3.8, 4.2), borderWidth: 1, borderColor: "rgba(255,46,69,0.6)", backgroundColor: "#0D0305", padding: 16, gap: 10 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
                    <Label tone="#FF5A6B">{t.penalty.redemption}</Label>
                    <Text style={{ fontFamily: font.body, fontSize: 12, color: "#A28C90" }}>{t.penalty.pickOne}</Text>
                  </View>
                  {chosen ? (
                    <>
                      <Text style={{ fontFamily: font.bodyMedium, fontSize: 15, lineHeight: 21, color: "#F4E9EA" }}>
                        {fill(t.penalty.acceptedText, { title: redemptionTitle(chosen, p.severity) })}
                      </Text>
                      <Text style={{ fontFamily: font.body, fontSize: 12, color: "#A28C90" }}>{chosen.proof}</Text>
                      <Pressable accessibilityRole="button" disabled={busy} onPress={() => act(() => finishRedemption(user.uid), () => setFreed(true))}
                        style={({ pressed }) => ({ minHeight: 50, alignItems: "center", justifyContent: "center", backgroundColor: "#B3142E", borderWidth: 1, borderColor: "#FF5A6B", opacity: busy ? 0.6 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] })}>
                        <Text style={{ fontFamily: font.bold, fontSize: 15, letterSpacing: 3, color: "#FFFFFF" }}>{t.penalty.finished}</Text>
                      </Pressable>
                    </>
                  ) : (
                    REDEMPTIONS.map((r) => (
                      <Pressable key={r.id} accessibilityRole="button" disabled={busy} onPress={() => act(() => chooseRedemption(user.uid, r.id))}
                        style={{ minHeight: 56, paddingHorizontal: 12, paddingVertical: 10, justifyContent: "center", gap: 3, borderWidth: 1, borderColor: "rgba(255,90,107,0.22)" }}>
                        <Text style={{ fontFamily: font.bold, fontSize: 16, color: "#F4E9EA" }}>{redemptionTitle(r, p.severity)}</Text>
                        <Text style={{ fontFamily: font.body, fontSize: 12, color: "#A28C90" }}>{r.proof}</Text>
                      </Pressable>
                    ))
                  )}
                  <Text style={{ fontFamily: font.body, fontSize: 12, color: "#A28C90" }}>{fill(t.penalty.noReward, { n: player.shields ?? 0 })}</Text>
                </Animated.View>
                <Animated.Text style={{ marginTop: 14, textAlign: "center", fontFamily: font.body, fontSize: 12, color: "#8E7A7E", opacity: at(3.8, 4.2) }}>{t.penalty.essentials}</Animated.Text>
              </>
            )}
          </Animated.View>
        </ScrollView>
      </View>
    </Modal>
  );
}

// One-time notice when a shield kept you out.
export function ShieldNotice({ player, onClose }) {
  const { color, font } = useTheme();
  return (
    <Modal transparent animationType="fade" visible onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "rgba(1,4,10,0.95)", alignItems: "center", justifyContent: "center", padding: 28, gap: 14 }}>
        <Label tone={color.hi} style={{ letterSpacing: 5, fontSize: 13 }}>{t.penalty.shieldTitle}</Label>
        <Text style={{ fontFamily: font.body, fontSize: 15, lineHeight: 22, color: "#CAD6EC", textAlign: "center" }}>{fill(t.penalty.shieldText, { n: player.shields ?? 0 })}</Text>
        <SysButton label={t.urgent.ok} onPress={onClose} style={{ alignSelf: "stretch", marginTop: 10 }} />
      </View>
    </Modal>
  );
}
