// Your titles: the one you wear under your name, and every title with how to earn it.
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TITLES, TITLE_GROUPS, hasTitle, shownTitle } from "../game/titles";
import { wearTitle } from "../lib/titles";
import { tapFeel } from "../lib/haptics";
import { Label } from "./sys";
import { useTheme } from "../theme";
import { t } from "../i18n";

const fill = (s, vars) => Object.entries(vars ?? {}).reduce((acc, [k, v]) => acc.split(`{${k}}`).join(String(v)), String(s ?? ""));

export function TitlesSheet({ user, player, onClose }) {
  const { color, font } = useTheme();
  const insets = useSafeAreaInsets();
  const worn = shownTitle(player)?.id ?? null;
  const count = TITLES.filter((x) => hasTitle(player, x.id)).length;
  return (
    <Modal transparent animationType="fade" visible onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "rgba(1,4,10,0.86)", paddingTop: insets.top + 12, paddingBottom: insets.bottom + 8 }}>
        <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 16, gap: 12 }}>
          <View style={{ flex: 1, gap: 2 }}>
            <Label tone={color.gold}>{t.titles.sheetTitle}</Label>
            <Text style={{ fontFamily: font.body, fontSize: 12, color: color.muted }}>{fill(t.titles.count, { n: count, of: TITLES.length })}</Text>
          </View>
          <Pressable accessibilityRole="button" onPress={onClose} hitSlop={10} style={{ minHeight: 44, justifyContent: "center", paddingHorizontal: 8 }}>
            <Text style={{ fontFamily: font.bodyBold, fontSize: 14, color: color.accent }}>{t.titles.close}</Text>
          </Pressable>
        </View>
        <ScrollView style={{ maxWidth: 520, width: "100%", alignSelf: "center" }} contentContainerStyle={{ padding: 16, gap: 16 }}>
          <Text style={{ fontFamily: font.body, fontSize: 13, lineHeight: 18, color: color.muted }}>{t.titles.sheetSub}</Text>
          {TITLE_GROUPS.map((g) => (
            <View key={g} style={{ gap: 6 }}>
              <Text style={{ fontFamily: font.bold, fontSize: 11, letterSpacing: 2, color: color.muted }}>{t.titles.groups[g]}</Text>
              {TITLES.filter((x) => x.group === g).map((x) => {
                const got = hasTitle(player, x.id);
                const on = worn === x.id;
                const have = Math.min(x.need, x.have(player));
                return (
                  <Pressable key={x.id} accessibilityRole="button" accessibilityState={{ selected: on, disabled: !got }} disabled={!got}
                    onPress={() => { tapFeel(); wearTitle(user.uid, on ? null : x.id).catch(() => {}); }}
                    style={({ pressed }) => ({ minHeight: 56, padding: 10, gap: 5, borderWidth: 1, borderColor: on ? color.gold : got ? "rgba(240,196,92,0.35)" : "rgba(159,203,255,0.12)",
                      backgroundColor: on ? "rgba(240,196,92,0.12)" : pressed ? "rgba(240,196,92,0.06)" : "transparent" })}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <Text style={{ flex: 1, fontFamily: font.bold, fontSize: 14, letterSpacing: 1.5, color: got ? color.gold : color.muted }}>{got ? x.name.toUpperCase() : x.name}</Text>
                      <Text style={{ fontFamily: font.bodyBold, fontSize: 11, color: on ? color.gold : got ? color.text : color.muted }}>
                        {on ? t.titles.wearing : got ? t.titles.wear : `${have} / ${x.need}`}
                      </Text>
                    </View>
                    <Text style={{ fontFamily: font.body, fontSize: 12, color: color.muted }}>{x.how}</Text>
                    {!got ? (
                      <View style={{ height: 3, backgroundColor: "rgba(159,203,255,0.1)" }}>
                        <View style={{ width: `${(have / x.need) * 100}%`, height: "100%", backgroundColor: color.gold, opacity: 0.6 }} />
                      </View>
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
}
