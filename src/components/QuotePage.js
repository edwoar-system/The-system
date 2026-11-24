// One quote, explained: what it means, who said it and when, and one way to use it today. Star it to see it more.
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import Svg, { Polygon } from "react-native-svg";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { QUOTE_INFO } from "../game/quoteInfo";
import { SCHOOL_NAMES } from "../game/quotes";
import { tapFeel } from "../lib/haptics";
import { Glow, Label } from "./sys";
import { useTheme } from "../theme";
import { t } from "../i18n";

// A five-point star, filled light blue when on (gold stays for coins and titles).
function Star({ on, size = 22 }) {
  const pts = Array.from({ length: 10 }, (_, i) => {
    const r = i % 2 ? size * 0.21 : size * 0.48;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    return `${size / 2 + r * Math.cos(a)},${size / 2 + r * Math.sin(a)}`;
  }).join(" ");
  return (
    <Svg width={size} height={size}>
      <Polygon points={pts} fill={on ? "#9FCBFF" : "none"} stroke={on ? "#9FCBFF" : "#8EA4C8"} strokeWidth={1.5} strokeLinejoin="round" />
    </Svg>
  );
}

export function StarButton({ on, onPress, label }) {
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected: on }} accessibilityLabel={label} hitSlop={10}
      onPress={() => { tapFeel(); onPress(); }} style={{ minWidth: 44, minHeight: 44, alignItems: "center", justifyContent: "center" }}>
      <Star on={on} />
    </Pressable>
  );
}

export default function QuotePage({ quote, starred, onStar, onClose }) {
  const { color, font } = useTheme();
  const insets = useSafeAreaInsets();
  if (!quote) return null;
  const info = QUOTE_INFO[quote.id] ?? {};
  const part = (title, text) => (text ? (
    <View style={{ gap: 6 }}>
      <Label tone={color.hi}>{title}</Label>
      <Text style={{ fontFamily: font.body, fontSize: 15, lineHeight: 23, color: color.text }}>{text}</Text>
    </View>
  ) : null);
  return (
    <Modal animationType="slide" visible onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: color.bg }}>
        <ScrollView contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 30, paddingHorizontal: 18, maxWidth: 520, width: "100%", alignSelf: "center", gap: 22 }}>
          <Glow height={380} at={0.2} />
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Pressable accessibilityRole="button" onPress={onClose} style={{ minHeight: 44, justifyContent: "center" }}>
              <Text style={{ fontFamily: font.bodyBold, fontSize: 14, color: color.accent }}>{`‹ ${t.quote.back}`}</Text>
            </Pressable>
            {onStar ? <StarButton on={starred} onPress={onStar} label={starred ? t.quote.unstar : t.quote.star} /> : null}
          </View>
          <View style={{ gap: 10, paddingLeft: 14, borderLeftWidth: 2, borderLeftColor: color.frame }}>
            <Text style={{ fontFamily: font.bodyMedium, fontSize: 22, lineHeight: 31, color: "#FFFFFF" }}>{quote.text}</Text>
            <Text style={{ fontFamily: font.body, fontSize: 13, color: color.muted }}>
              {[quote.who === quote.work ? quote.who : `${quote.who}, ${quote.work}`, SCHOOL_NAMES[quote.school]].join("  ·  ")}
            </Text>
          </View>
          {part(t.quote.meaning, info.meaning)}
          {part(t.quote.story, info.story)}
          {part(t.quote.today, info.today)}
          {onStar ? (
            <Text style={{ fontFamily: font.body, fontSize: 12, lineHeight: 17, color: color.muted }}>{starred ? t.quote.starredNote : t.quote.starNote}</Text>
          ) : null}
        </ScrollView>
      </View>
    </Modal>
  );
}
