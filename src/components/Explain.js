// Plain-word explanations of the System's own words (rust, tiers, mountains, ...).
// A small "?" next to a word opens its explanation; Settings lists them all under "How the System works".
import { useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { Frame, Label } from "./sys";
import { useTheme } from "../theme";
import { t } from "../i18n";

export const TERMS = ["quests", "coins", "exp", "stats", "ranks", "trials", "rust", "tiers", "streak", "penalty", "urgent", "mountains", "proof", "duties"];

export function ExplainCard({ term, onClose }) {
  const { color, font } = useTheme();
  if (!term) return null;
  const e = t.explain.terms[term];
  return (
    <Modal transparent animationType="fade" visible onRequestClose={onClose}>
      <Pressable accessibilityLabel={t.explain.close} onPress={onClose} style={{ flex: 1, backgroundColor: "rgba(1,4,10,0.88)", justifyContent: "center", padding: 18 }}>
        <Pressable onPress={() => {}} style={{ width: "100%", maxWidth: 420, alignSelf: "center" }}>
          <Frame kind="premium" cut={16} contentStyle={{ padding: 18, gap: 12 }}>
            <Label tone={color.hi}>{t.explain.kicker}</Label>
            <Text style={{ fontFamily: font.bold, fontSize: 22, color: "#FFFFFF" }}>{e.title}</Text>
            <Text style={{ fontFamily: font.body, fontSize: 15, lineHeight: 23, color: color.text }}>{e.text}</Text>
            {e.example ? <Text style={{ fontFamily: font.body, fontSize: 14, lineHeight: 21, color: color.muted }}>{e.example}</Text> : null}
            <Pressable accessibilityRole="button" onPress={onClose} style={{ minHeight: 44, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ fontFamily: font.bodyBold, fontSize: 14, color: color.accent }}>{t.explain.gotIt}</Text>
            </Pressable>
          </Frame>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// A small round "?" that explains one word.
export function HelpDot({ term, size = 20 }) {
  const { color, font } = useTheme();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable accessibilityRole="button" accessibilityLabel={`${t.explain.what} ${t.explain.terms[term].title}`} hitSlop={12} onPress={() => setOpen(true)}
        style={{ width: size, height: size, borderRadius: size / 2, borderWidth: 1, borderColor: color.muted, alignItems: "center", justifyContent: "center" }}>
        <Text style={{ fontFamily: font.bold, fontSize: size * 0.6, lineHeight: size * 0.8, color: color.muted }}>?</Text>
      </Pressable>
      {open ? <ExplainCard term={term} onClose={() => setOpen(false)} /> : null}
    </>
  );
}

// The full list, for Settings.
export function Glossary() {
  const { color, font } = useTheme();
  const [open, setOpen] = useState(null);
  return (
    <View>
      {TERMS.map((k, i) => (
        <Pressable key={k} accessibilityRole="button" onPress={() => setOpen(k)}
          style={({ pressed }) => ({ minHeight: 50, flexDirection: "row", alignItems: "center", gap: 12, borderTopWidth: i ? 1 : 0, borderTopColor: color.line, opacity: pressed ? 0.7 : 1 })}>
          <View style={{ flex: 1, gap: 2, paddingVertical: 8 }}>
            <Text style={{ fontFamily: font.bold, fontSize: 15, color: "#FFFFFF" }}>{t.explain.terms[k].title}</Text>
            <Text numberOfLines={1} style={{ fontFamily: font.body, fontSize: 12, color: color.muted }}>{t.explain.terms[k].text}</Text>
          </View>
          <Text style={{ fontFamily: font.bold, fontSize: 18, color: color.muted }}>›</Text>
        </Pressable>
      ))}
      <ExplainCard term={open} onClose={() => setOpen(null)} />
    </View>
  );
}
