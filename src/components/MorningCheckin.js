// The morning check-in: the first time you open the app in the morning, the System asks how you slept,
// what kind of day it is, whether there's time for your morning quests, and your one main thing today.
// Sleep goes into the sleep log (buffs and debuffs); the rest shapes today's morning block.
import { useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { saveCheckin } from "../lib/day";
import { logSleep } from "../lib/habits";
import { bedFrom, morningItems } from "../game/morning";
import { useTheme } from "../theme";
import { t } from "../i18n";

const fill = (s, vars) => Object.entries(vars ?? {}).reduce((acc, [k, v]) => acc.split(`{${k}}`).join(String(v)), String(s ?? ""));
const HOURS = [5, 6, 6.5, 7, 7.5, 8, 8.5, 9, 10];

function Pick({ on, text, onPress, wide }) {
  const { color, font } = useTheme();
  return (
    <Pressable accessibilityRole="radio" accessibilityState={{ checked: on }} onPress={onPress}
      style={({ pressed }) => ({ minHeight: 42, minWidth: wide ? "100%" : 52, paddingHorizontal: 10, alignItems: wide ? "flex-start" : "center", justifyContent: "center", borderWidth: 1,
        borderColor: on ? color.frame : "rgba(159,203,255,0.22)", backgroundColor: pressed ? "rgba(159,203,255,0.2)" : on ? "rgba(159,203,255,0.16)" : "transparent" })}>
      <Text style={{ fontFamily: font.bodyBold, fontSize: 13, color: on ? "#FFFFFF" : color.text }}>{text}</Text>
    </Pressable>
  );
}

export default function MorningCheckin({ user, player }) {
  const { color, font } = useTheme();
  const now = new Date();
  const wakeGuess = Math.min(now.getHours() + now.getMinutes() / 60, player.profile?.wake ?? 7);
  const usual = (() => { const b = player.profile?.bed ?? 23; const w = player.profile?.wake ?? 7; return Math.round(((w - b + 24) % 24) * 2) / 2; })();
  const [quality, setQuality] = useState(null);
  const [hours, setHours] = useState(HOURS.includes(usual) ? usual : 8);
  const [kind, setKind] = useState(null);
  const [time, setTime] = useState(null);
  const [plan, setPlan] = useState("");
  const [busy, setBusy] = useState(false);
  const [gone, setGone] = useState(false);
  if (gone) return null;
  const items = morningItems(player);

  async function save(skip = false) {
    setBusy(true);
    try {
      if (!skip && quality) await logSleep(user.uid, bedFrom(Math.round(wakeGuess * 4) / 4, hours), Math.round(wakeGuess * 4) / 4, quality).catch(() => null);
      await saveCheckin(user.uid, skip ? { skipped: true } : { quality, hours, kind, time: time ?? "all", plan: plan.trim().slice(0, 80) });
      setGone(true);
    } catch {
      setBusy(false);
    }
  }

  const H = ({ children }) => <Text style={{ marginTop: 6, fontFamily: font.bold, fontSize: 11, letterSpacing: 3, color: color.hi }}>{children}</Text>;
  return (
    <Modal transparent animationType="fade" visible onRequestClose={() => save(true)}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, backgroundColor: "rgba(1,4,10,0.8)", justifyContent: "center", padding: 14 }}>
        <View style={{ maxWidth: 460, width: "100%", maxHeight: "92%", alignSelf: "center", borderWidth: 1, borderColor: color.frame, backgroundColor: "rgba(4,10,24,0.98)",
          shadowColor: color.accent, shadowOpacity: 0.5, shadowRadius: 22, shadowOffset: { width: 0, height: 0 } }}>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, gap: 8 }}>
            <Text style={{ fontFamily: font.bold, fontSize: 12, letterSpacing: 4, color: color.accent, textAlign: "center" }}>{t.morning.checkHeader}</Text>
            <Text style={{ fontFamily: font.bold, fontSize: 20, color: "#FFFFFF", textAlign: "center" }}>{t.morning.checkTitle}</Text>

            <H>{t.morning.qSleep}</H>
            <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
              {[1, 2, 3, 4, 5].map((q) => <Pick key={q} on={quality === q} text={t.morning.quality[q]} onPress={() => setQuality(q)} />)}
            </View>
            <H>{t.morning.qHours}</H>
            <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
              {HOURS.map((h) => <Pick key={h} on={hours === h} text={`${h} h`} onPress={() => setHours(h)} />)}
            </View>

            <H>{t.morning.qDay}</H>
            <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
              {["school", "free", "busy"].map((k) => <Pick key={k} on={kind === k} text={t.morning.kinds[k]} onPress={() => { setKind(k); if (!time) setTime(k === "free" ? "all" : "quick"); }} />)}
            </View>

            <H>{t.morning.qTime}</H>
            <Text style={{ fontFamily: font.body, fontSize: 12, lineHeight: 17, color: color.muted }}>{fill(t.morning.yourItems, { list: items.map((id) => t.morning.items[id]).join(", ") })}</Text>
            <View style={{ gap: 6 }}>
              {["all", "quick", "none"].map((k) => <Pick key={k} wide on={time === k} text={fill(t.morning.times[k], { first: t.morning.items[items[0]] })} onPress={() => setTime(k)} />)}
            </View>

            <H>{t.morning.qPlan}</H>
            <TextInput value={plan} onChangeText={setPlan} placeholder={t.morning.planPh} placeholderTextColor="#4A5A7A" maxLength={80} returnKeyType="done"
              style={{ minHeight: 44, paddingHorizontal: 12, fontFamily: font.body, fontSize: 15, color: "#FFFFFF", borderWidth: 1, borderColor: "rgba(159,203,255,0.3)", backgroundColor: "rgba(5,10,24,0.7)" }} />

            <Pressable accessibilityRole="button" disabled={busy} onPress={() => save(false)}
              style={({ pressed }) => ({ marginTop: 8, minHeight: 50, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: color.frame, backgroundColor: pressed ? "rgba(159,203,255,0.22)" : "rgba(159,203,255,0.12)" })}>
              <Text style={{ fontFamily: font.bold, fontSize: 14, letterSpacing: 2, color: "#FFFFFF" }}>{t.morning.go}</Text>
            </Pressable>
            <Pressable accessibilityRole="button" disabled={busy} onPress={() => save(true)} style={{ minHeight: 40, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ fontFamily: font.bodyBold, fontSize: 13, color: color.muted }}>{t.morning.skip}</Text>
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
