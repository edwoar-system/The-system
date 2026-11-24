// Settings tab: profile, info for fair rank norms, the System settings, quest history and the account.
import { useState } from "react";
import { Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import * as Updates from "expo-updates";
import { signOut } from "firebase/auth";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { auth } from "../lib/firebase";
import { setPlayerName, setProfile } from "../lib/player";
import { setUrgentPerDay } from "../lib/urgent";
import { scheduleSeverity } from "../lib/penalty";
import { useHistory } from "../lib/history";
import { URGENT } from "../game/urgent";
import { severityFor } from "../game/penalty";
import { todayKey } from "../game/quests";
import { Coins, Frame, Glow, Label, SysButton } from "./sys";
import { Button } from "./ui";
import { SeverityChips, UrgentChips } from "./systemChoices";
import { useTheme } from "../theme";
import { t } from "../i18n";

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

function History({ uid }) {
  const { color, font } = useTheme();
  const { items, error } = useHistory(uid);
  if (!items) return <Text style={{ fontFamily: font.body, fontSize: 13, color: color.muted }}>{t.settings.loading}</Text>;
  if (error) return <Text style={{ fontFamily: font.body, fontSize: 13, color: color.dangerSoft }}>{t.settings.historyError}</Text>;
  if (!items.length) return <Text style={{ fontFamily: font.body, fontSize: 13, color: color.muted }}>{t.settings.historyEmpty}</Text>;
  let lastDate = null;
  return (
    <View>
      {items.map((it) => {
        const header = it.date !== lastDate ? it.date : null;
        lastDate = it.date;
        return (
          <View key={it.id}>
            {header ? <Text style={{ marginTop: 10, marginBottom: 2, fontFamily: font.bold, fontSize: 11, letterSpacing: 2, color: color.muted }}>{header}</Text> : null}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8, borderTopWidth: 1, borderTopColor: color.line }}>
              <Text style={{ width: 34, fontFamily: font.bold, fontSize: 11, letterSpacing: 1, color: color.accent }}>{it.stat}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: font.bodyMedium, fontSize: 14, lineHeight: 19, color: color.text }}>{it.title}</Text>
                {it.value != null ? <Text style={{ fontFamily: font.num, fontSize: 13, color: color.muted }}>{it.unit === "seconds" ? `${Math.floor(it.value / 60)}:${String(it.value % 60).padStart(2, "0")}` : `${it.value} ${t.sheet.reps}`}</Text> : null}
              </View>
              <Coins value={(it.coins ?? 0) + (it.bonus ?? 0)} sign="+" size={14} />
            </View>
          </View>
        );
      })}
    </View>
  );
}

export default function Settings({ user, player, synced }) {
  const { color, font } = useTheme();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState(player.name ?? "");
  const [age, setAge] = useState(player.profile?.age ? String(player.profile.age) : "");
  const [sex, setSex] = useState(player.profile?.sex ?? null);
  const [weight, setWeight] = useState(player.profile?.weight ? String(player.profile.weight) : "");
  const [saved, setSaved] = useState(null); // "name" | "profile"

  const today = todayKey();
  const severity = severityFor(player, today);
  const pendingSeverity = player.penaltySeverityNext && player.penaltySeverityFrom > today ? player.penaltySeverityNext : null;

  async function saveName() {
    await setPlayerName(user.uid, name.trim());
    setSaved("name");
  }
  async function saveProfile() {
    const num = (v) => { const n = Number(v.replace(",", ".")); return v.trim() && Number.isFinite(n) && n > 0 ? n : null; };
    await setProfile(user.uid, { age: num(age), sex, weight: num(weight) });
    setSaved("profile");
  }

  return (
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
          <View style={{ flex: 1 }}><Input label={t.settings.name} value={name} onChangeText={(v) => { setName(v); setSaved(null); }} /></View>
          <SysButton label={(saved === "name" ? t.settings.saved : t.settings.save).toUpperCase()} disabled={!name.trim() || name.trim() === player.name} onPress={saveName} style={{ minHeight: 46 }} />
        </View>
      </Section>

      <Section title={t.settings.about} sub={t.settings.aboutSub}>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Input label={t.settings.age} value={age} onChangeText={(v) => { setAge(v); setSaved(null); }} keyboardType="number-pad" width={90} />
          <View style={{ flex: 1 }}><Input label={t.settings.weight} value={weight} onChangeText={(v) => { setWeight(v); setSaved(null); }} keyboardType="decimal-pad" /></View>
        </View>
        <View style={{ gap: 6 }}>
          <Text style={{ fontFamily: font.bodyBold, fontSize: 12, color: color.muted }}>{t.settings.sex}</Text>
          <View style={{ flexDirection: "row", gap: 6 }}>
            {["male", "female", "other"].map((s) => {
              const on = sex === s;
              return (
                <Pressable key={s} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => { setSex(on ? null : s); setSaved(null); }}
                  style={{ flex: 1, minHeight: 44, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: on ? color.frame : "rgba(159,203,255,0.22)", backgroundColor: on ? "rgba(159,203,255,0.16)" : "transparent" }}>
                  <Text style={{ fontFamily: font.bold, fontSize: 14, color: on ? "#FFFFFF" : color.muted }}>{t.settings.sexes[s]}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
        <SysButton label={(saved === "profile" ? t.settings.saved : t.settings.save).toUpperCase()} onPress={saveProfile} />
      </Section>

      <Section title={t.settings.system}>
        <View style={{ gap: 8 }}>
          <Label>{t.settings.urgent.toUpperCase()}</Label>
          <UrgentChips value={player.urgentPerDay ?? URGENT.defaultPerDay} onChange={(n) => setUrgentPerDay(user.uid, n)} />
        </View>
        <View style={{ gap: 8 }}>
          <Label>{t.settings.severity.toUpperCase()}</Label>
          <SeverityChips value={pendingSeverity ?? severity} onChange={(s) => scheduleSeverity(user.uid, s)} />
          {pendingSeverity ? <Text style={{ fontFamily: font.bodyMedium, fontSize: 12, color: color.frame }}>{fill(t.settings.severityNext, { sev: t.penalty.severities[pendingSeverity] })}</Text> : null}
        </View>
      </Section>

      <Section title={t.settings.history}>
        <History uid={user.uid} />
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
  );
}
