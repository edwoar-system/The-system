// Add your own skill: the Guild doesn't have it yet, so the System builds one from a few answers.
import { useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CUSTOM_KINDS, CUSTOM_MINUTES, buildCustom, customId } from "../game/custom";
import { skillById } from "../game/guild";
import { STATS } from "../game/quests";
import { saveCustomSkill } from "../lib/player";
import { showSystem } from "../lib/popup";
import { Label } from "./sys";
import { useTheme } from "../theme";
import { t } from "../i18n";

const fill = (s, vars) => Object.entries(vars ?? {}).reduce((acc, [k, v]) => acc.split(`{${k}}`).join(String(v)), String(s ?? ""));

// The stat a kind of skill usually trains, as a starting guess.
const GUESS = { sport: "AGI", knowledge: "INT", craft: "INT", habit: "WIL" };

function Choice({ on, text, sub, onPress }) {
  const { color, font } = useTheme();
  return (
    <Pressable accessibilityRole="radio" accessibilityState={{ checked: on }} onPress={onPress}
      style={({ pressed }) => ({ minHeight: 44, paddingHorizontal: 12, paddingVertical: 8, justifyContent: "center", borderWidth: 1,
        borderColor: on ? color.frame : "rgba(159,203,255,0.22)", backgroundColor: pressed ? "rgba(159,203,255,0.2)" : on ? "rgba(159,203,255,0.14)" : "transparent" })}>
      <Text style={{ fontFamily: font.bold, fontSize: 13, color: on ? "#FFFFFF" : color.text }}>{text}</Text>
      {sub ? <Text style={{ fontFamily: font.body, fontSize: 11, color: color.muted }}>{sub}</Text> : null}
    </Pressable>
  );
}

export default function AddSkill({ user, start = "", onClose, onAdded }) {
  const { color, font } = useTheme();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState(start);
  const [kind, setKind] = useState("sport");
  const [stat, setStat] = useState(null); // null = the guess for the kind
  const [minutes, setMinutes] = useState(30);
  const [counts, setCounts] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const theStat = stat ?? GUESS[kind];
  const id = customId(name);
  const clash = skillById[id] && !skillById[id].custom;

  async function save() {
    if (name.trim().length < 2 || busy) return;
    if (clash) { setError(t.addSkill.exists); return; }
    setBusy(true);
    setError(null);
    try {
      await saveCustomSkill(user.uid, id, buildCustom({ name, stat: theStat, kind, minutes, counts }));
      showSystem({ title: t.addSkill.doneTitle, lines: [fill(t.addSkill.doneLine, { name: name.trim() })], tone: "buff" });
      onAdded?.(id);
    } catch {
      setError(t.addSkill.failed);
      setBusy(false);
    }
  }

  const input = { minHeight: 46, paddingHorizontal: 12, fontFamily: font.body, fontSize: 15, color: "#FFFFFF", borderWidth: 1, borderColor: "rgba(159,203,255,0.3)", backgroundColor: "rgba(5,10,24,0.7)" };
  return (
    <Modal animationType="slide" visible onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, backgroundColor: color.bg }}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingTop: insets.top + 12, paddingBottom: insets.bottom + 40, paddingHorizontal: 16, gap: 14, maxWidth: 520, width: "100%", alignSelf: "center" }}>
          <Pressable accessibilityRole="button" onPress={onClose} hitSlop={8} style={{ minHeight: 44, justifyContent: "center" }}>
            <Text style={{ fontFamily: font.bodyBold, fontSize: 14, color: color.muted }}>{t.addSkill.cancel}</Text>
          </Pressable>
          <Label tone={color.accent} style={{ letterSpacing: 4 }}>{t.addSkill.system}</Label>
          <Text accessibilityRole="header" style={{ fontFamily: font.bold, fontSize: 24, color: "#FFFFFF" }}>{t.addSkill.title}</Text>
          <Text style={{ fontFamily: font.body, fontSize: 14, lineHeight: 20, color: color.muted }}>{t.addSkill.sub}</Text>

          <Label>{t.addSkill.name}</Label>
          <TextInput value={name} onChangeText={(v) => { setName(v); setError(null); }} placeholder={t.addSkill.namePh} placeholderTextColor="#4A5A7A" maxLength={40} style={input} />

          <Label>{t.addSkill.kind}</Label>
          <View style={{ gap: 6 }}>
            {CUSTOM_KINDS.map((k) => <Choice key={k} on={kind === k} text={t.addSkill.kinds[k].name} sub={t.addSkill.kinds[k].sub} onPress={() => { setKind(k); setStat(null); }} />)}
          </View>

          <Label>{t.addSkill.stat}</Label>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
            {STATS.map((s) => <Choice key={s} on={theStat === s} text={`${s} · ${t.stats[s]}`} onPress={() => setStat(s)} />)}
          </View>

          <Label>{kind === "habit" ? t.addSkill.minutesHabit : t.addSkill.minutes}</Label>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
            {CUSTOM_MINUTES.map((m) => <Choice key={m} on={minutes === m} text={fill(t.addSkill.min, { n: m })} onPress={() => setMinutes(m)} />)}
          </View>

          <Label>{t.addSkill.counts}</Label>
          <TextInput value={counts} onChangeText={setCounts} placeholder={t.addSkill.countsPh} placeholderTextColor="#4A5A7A" maxLength={140} multiline style={[input, { minHeight: 70, paddingTop: 12 }]} />

          <View style={{ borderWidth: 1, borderColor: "rgba(159,203,255,0.2)", padding: 12, gap: 4 }}>
            <Text style={{ fontFamily: font.bold, fontSize: 11, letterSpacing: 2, color: color.muted }}>{t.addSkill.preview}</Text>
            <Text style={{ fontFamily: font.bodyBold, fontSize: 15, color: "#FFFFFF" }}>{name.trim() || t.addSkill.namePh}</Text>
            <Text style={{ fontFamily: font.body, fontSize: 13, lineHeight: 18, color: color.text }}>{fill(kind === "habit" ? t.addSkill.previewHabit : t.addSkill.previewLine, { n: minutes, stat: theStat })}</Text>
          </View>

          {error ? <Text style={{ fontFamily: font.bodyMedium, fontSize: 13, color: "#F6B45A" }}>{error}</Text> : null}
          <Pressable accessibilityRole="button" disabled={busy || name.trim().length < 2} onPress={save}
            style={({ pressed }) => ({ minHeight: 50, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: color.frame,
              opacity: name.trim().length < 2 ? 0.45 : 1, backgroundColor: pressed ? "rgba(159,203,255,0.22)" : "rgba(159,203,255,0.1)" })}>
            <Text style={{ fontFamily: font.bold, fontSize: 14, letterSpacing: 2, color: "#FFFFFF" }}>{busy ? t.addSkill.saving : t.addSkill.save}</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}
