// What a stat means: tap STR, AGI, ... anywhere to see its full name, what raises it and which skills count.
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { LADDERS } from "../game/ladders";
import { skillById } from "../game/guild";
import { Frame, Label } from "./sys";
import { useTheme } from "../theme";
import { t } from "../i18n";

const fill = (s, vars) => Object.entries(vars).reduce((acc, [k, v]) => acc.split(`{${k}}`).join(String(v)), s);

export default function StatInfo({ stat, value, onClose, onOpenSkill }) {
  const { color, font } = useTheme();
  if (!stat) return null;
  const info = t.statInfo[stat];
  const skills = LADDERS.filter((l) => l.stat === stat).map((l) => ({ id: l.id, name: skillById[l.id]?.name ?? l.id }));
  return (
    <Modal transparent animationType="fade" visible onRequestClose={onClose}>
      <Pressable accessibilityLabel={t.statInfo.close} onPress={onClose} style={{ flex: 1, backgroundColor: "rgba(1,4,10,0.88)", justifyContent: "center", padding: 18 }}>
        <Pressable onPress={() => {}} style={{ width: "100%", maxWidth: 420, alignSelf: "center", maxHeight: "85%" }}>
          <Frame kind="premium" cut={16} contentStyle={{ padding: 18 }}>
            <ScrollView contentContainerStyle={{ gap: 14 }}>
              <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" }}>
                <View style={{ gap: 2 }}>
                  <Label tone={color.hi}>{stat}</Label>
                  <Text style={{ fontFamily: font.bold, fontSize: 26, color: "#FFFFFF" }}>{t.stats[stat]}</Text>
                </View>
                {value != null ? <Text style={{ fontFamily: font.num, fontSize: 36, color: color.hi }}>{value}</Text> : null}
              </View>
              <Text style={{ fontFamily: font.bodyMedium, fontSize: 16, lineHeight: 23, color: "#FFFFFF" }}>{info.what}</Text>
              <View style={{ gap: 4 }}>
                <Text style={{ fontFamily: font.bodyBold, fontSize: 13, color: color.text }}>{t.statInfo.raisedBy}</Text>
                <Text style={{ fontFamily: font.body, fontSize: 14, lineHeight: 20, color: color.muted }}>{info.raise}</Text>
              </View>
              <Text style={{ fontFamily: font.body, fontSize: 13, lineHeight: 19, color: color.muted }}>{fill(t.statInfo.number, { stat })}</Text>
              <View style={{ gap: 8 }}>
                <Text style={{ fontFamily: font.bodyBold, fontSize: 13, color: color.text }}>{fill(t.statInfo.skills, { n: skills.length })}</Text>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                  {skills.map((s) => (
                    <Pressable key={s.id} accessibilityRole={onOpenSkill ? "button" : undefined} disabled={!onOpenSkill} onPress={() => { onClose(); onOpenSkill?.(s.id); }}
                      style={{ minHeight: 34, paddingHorizontal: 10, justifyContent: "center", borderWidth: 1, borderColor: "rgba(159,203,255,0.22)" }}>
                      <Text style={{ fontFamily: font.bodyMedium, fontSize: 12, color: color.text }}>{s.name}</Text>
                    </Pressable>
                  ))}
                </View>
              </View>
              <Pressable accessibilityRole="button" onPress={onClose} style={{ minHeight: 44, alignItems: "center", justifyContent: "center" }}>
                <Text style={{ fontFamily: font.bodyBold, fontSize: 14, color: color.accent }}>{t.statInfo.close}</Text>
              </Pressable>
            </ScrollView>
          </Frame>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
