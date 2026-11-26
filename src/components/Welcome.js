// The first-start tip: the System greets a new player, asks their name and points them to the first quests
// (components/FirstQuests.js), which tune the System to them before any real quest.
import { useState } from "react";
import { Modal, Pressable, Text, TextInput, View } from "react-native";
import { doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { setPlayerName } from "../lib/player";
import { useTheme } from "../theme";
import { t } from "../i18n";

// New players only: the tip wasn't seen yet and hardly anything is trained.
export const needsWelcome = (player) => !player?.tips?.welcome && Object.keys(player?.skills ?? {}).length < 3;

function Btn({ label, onPress, main }) {
  const { color, font } = useTheme();
  return (
    <Pressable accessibilityRole="button" onPress={onPress}
      style={({ pressed }) => ({ minHeight: 48, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: main ? color.frame : "rgba(159,203,255,0.25)",
        backgroundColor: pressed ? "rgba(159,203,255,0.22)" : main ? "rgba(159,203,255,0.12)" : "transparent" })}>
      <Text style={{ fontFamily: font.bold, fontSize: 13, letterSpacing: 2, color: main ? "#FFFFFF" : color.muted }}>{label}</Text>
    </Pressable>
  );
}

function Step({ n, title, text, done }) {
  const { color, font } = useTheme();
  return (
    <View style={{ flexDirection: "row", gap: 12 }}>
    <View style={{ width: 28, height: 28, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: done ? color.purple : color.frame, transform: [{ rotate: "45deg" }] }}>
      <Text style={{ transform: [{ rotate: "-45deg" }], fontFamily: font.num, fontSize: 13, color: done ? color.purple : "#FFFFFF" }}>{done ? "✓" : n}</Text>
    </View>
    <View style={{ flex: 1, gap: 2 }}>
      <Text style={{ fontFamily: font.bodyBold, fontSize: 15, color: "#FFFFFF" }}>{title}</Text>
      <Text style={{ fontFamily: font.body, fontSize: 13, lineHeight: 18, color: color.text }}>{text}</Text>
    </View>
  </View>
  );
}

export default function Welcome({ user, player }) {
  const { color, font } = useTheme();
  const [name, setName] = useState(player?.name ?? "");
  const [gone, setGone] = useState(false);
  if (gone || !needsWelcome(player)) return null;
  const close = () => {
    if (!player.name && name.trim()) setPlayerName(user.uid, name.trim()).catch(() => {});
    updateDoc(doc(db, "players", user.uid), { "tips.welcome": true, updatedAt: serverTimestamp() }).catch(() => {});
    setGone(true);
  };
  return (
    <Modal transparent animationType="fade" visible onRequestClose={close}>
      <View style={{ flex: 1, backgroundColor: "rgba(1,4,10,0.78)", justifyContent: "center", padding: 18 }}>
        <View style={{ maxWidth: 440, width: "100%", alignSelf: "center", borderWidth: 1, borderColor: color.frame, backgroundColor: "rgba(4,10,24,0.98)", padding: 18, gap: 14,
          shadowColor: color.accent, shadowOpacity: 0.6, shadowRadius: 24, shadowOffset: { width: 0, height: 0 } }}>
          <Text style={{ fontFamily: font.bold, fontSize: 12, letterSpacing: 4, color: color.accent, textAlign: "center" }}>{t.welcome.header}</Text>
          <Text style={{ fontFamily: font.bold, fontSize: 21, lineHeight: 27, color: "#FFFFFF", textAlign: "center" }}>{t.welcome.title}</Text>
          <Text style={{ fontFamily: font.body, fontSize: 14, lineHeight: 20, color: color.text, textAlign: "center" }}>{t.welcome.sub}</Text>
          <View style={{ gap: 12, marginTop: 4 }}>
            <Step n="1" title={t.welcome.s1} text={t.welcome.s1Text} />
            <Step n="2" title={t.welcome.s2} text={t.welcome.s2Text} />
          </View>
          {!player.name ? (
            <TextInput value={name} onChangeText={setName} placeholder={t.welcome.namePh} placeholderTextColor="#4A5A7A" maxLength={24} autoCapitalize="words" accessibilityLabel={t.welcome.namePh}
              style={{ minHeight: 46, paddingHorizontal: 12, fontFamily: font.bodyBold, fontSize: 16, color: "#FFFFFF", textAlign: "center", borderWidth: 1, borderColor: "rgba(159,203,255,0.35)", backgroundColor: "rgba(5,10,24,0.7)" }} />
          ) : null}
          <Btn main label={t.welcome.go} onPress={close} />
        </View>
      </View>
    </Modal>
  );
}
