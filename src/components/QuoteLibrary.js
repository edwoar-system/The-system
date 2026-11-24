// The quote library: every System message, by school. Your own schools (Tune the System) come first.
import { useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { QUOTES, SCHOOL_NAMES } from "../game/quotes";
import { Glow, Label } from "./sys";
import { useTheme } from "../theme";
import { t } from "../i18n";

function Chip({ label, on, onPress }) {
  const { color, font } = useTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected: on }} onPress={onPress}
      style={{ minHeight: 40, paddingHorizontal: 12, justifyContent: "center", borderWidth: 1, borderColor: on ? color.frame : "rgba(159,203,255,0.22)", backgroundColor: on ? "rgba(159,203,255,0.16)" : "transparent" }}>
      <Text style={{ fontFamily: font.bold, fontSize: 13, color: on ? "#FFFFFF" : color.muted }}>{label}</Text>
    </Pressable>
  );
}

export default function QuoteLibrary({ mine = [], onClose }) {
  const { color, font } = useTheme();
  const insets = useSafeAreaInsets();
  const [school, setSchool] = useState(null);
  const schools = Object.keys(SCHOOL_NAMES).sort((a, b) => (mine.includes(b) ? 1 : 0) - (mine.includes(a) ? 1 : 0));
  const shown = schools.filter((s) => !school || s === school);

  return (
    <Modal animationType="slide" visible onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: color.bg }}>
        <ScrollView contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 30, paddingHorizontal: 14, maxWidth: 520, width: "100%", alignSelf: "center" }}>
          <Glow height={420} at={0.2} />
          <Pressable accessibilityRole="button" onPress={onClose} style={{ minHeight: 44, justifyContent: "center", alignSelf: "flex-start" }}>
            <Text style={{ fontFamily: font.bodyBold, fontSize: 14, color: color.accent }}>{`‹ ${t.quote.back}`}</Text>
          </Pressable>
          <Text accessibilityRole="header" style={{ marginTop: 6, textAlign: "center", fontFamily: font.bold, fontSize: 26, letterSpacing: 1, color: "#FFFFFF" }}>{t.quote.libraryTitle}</Text>
          <Text style={{ marginTop: 6, marginBottom: 14, textAlign: "center", fontFamily: font.body, fontSize: 13, lineHeight: 18, color: color.muted }}>{t.quote.librarySub}</Text>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingBottom: 4 }}>
            <Chip label={t.quote.all} on={!school} onPress={() => setSchool(null)} />
            {schools.map((s) => <Chip key={s} label={SCHOOL_NAMES[s]} on={school === s} onPress={() => setSchool(school === s ? null : s)} />)}
          </ScrollView>

          {shown.map((s) => (
            <View key={s} style={{ marginTop: 22, gap: 14 }}>
              <View style={{ flexDirection: "row", alignItems: "baseline", gap: 10 }}>
                <Label tone={color.hi}>{SCHOOL_NAMES[s].toUpperCase()}</Label>
                {mine.includes(s) ? <Text style={{ fontFamily: font.body, fontSize: 12, color: color.muted }}>{t.quote.yours}</Text> : null}
              </View>
              {QUOTES.filter((q) => q.school === s).map((q) => (
                <View key={q.text} style={{ paddingLeft: 14, borderLeftWidth: 2, borderLeftColor: mine.includes(s) ? color.frame : color.line, gap: 4 }}>
                  <Text selectable style={{ fontFamily: font.bodyMedium, fontSize: 16, lineHeight: 23, color: "#FFFFFF" }}>{q.text}</Text>
                  <Text style={{ fontFamily: font.body, fontSize: 12, color: color.muted }}>{q.who === q.work ? q.who : `${q.who}, ${q.work}`}</Text>
                </View>
              ))}
            </View>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
}
