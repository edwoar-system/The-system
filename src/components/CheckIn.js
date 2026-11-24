// Check-in after an important quest (main quests and trials): how it went, and whether you cheated.
import { useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { CHEAT, HOW, checkIn } from "../lib/honesty";
import { Frame, Label, SysButton } from "./sys";
import { useTheme } from "../theme";
import { t } from "../i18n";

function Chips({ options, labels, value, onChange, warn }) {
  const { color, font } = useTheme();
  return (
    <View style={{ flexDirection: "row", gap: 6 }}>
      {options.map((o) => {
        const on = value === o;
        const red = warn && on && o !== "no";
        return (
          <Pressable key={o} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => onChange(o)}
            style={{ flex: 1, minHeight: 46, alignItems: "center", justifyContent: "center", borderWidth: 1,
              borderColor: on ? (red ? "#F6B45A" : color.frame) : "rgba(159,203,255,0.22)", backgroundColor: on ? (red ? "rgba(246,180,90,0.12)" : "rgba(159,203,255,0.16)") : "transparent" }}>
            <Text style={{ fontFamily: font.bold, fontSize: 14, color: on ? "#FFFFFF" : color.muted }}>{labels[o]}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// data: { logId, title } or null
export default function CheckIn({ uid, data, onClose }) {
  const { color, font } = useTheme();
  const [how, setHow] = useState(null);
  const [cheat, setCheat] = useState(null);
  if (!data) return null;
  const close = () => { setHow(null); setCheat(null); onClose(); };
  async function save() {
    checkIn(uid, data.logId, { how, cheat }).catch(() => {});
    close();
  }
  return (
    <Modal transparent animationType="fade" visible onRequestClose={close}>
      <View style={{ flex: 1, backgroundColor: "rgba(1,4,10,0.9)", justifyContent: "center", padding: 18 }}>
        <Frame kind="premium" cut={16} style={{ width: "100%", maxWidth: 420, alignSelf: "center" }} contentStyle={{ padding: 18, gap: 14 }}>
          <View style={{ gap: 4 }}>
            <Label tone={color.hi}>{t.checkIn.title}</Label>
            <Text style={{ fontFamily: font.bold, fontSize: 18, lineHeight: 24, color: "#FFFFFF" }}>{data.title}</Text>
          </View>
          <View style={{ gap: 8 }}>
            <Text style={{ fontFamily: font.bodyBold, fontSize: 14, color: color.text }}>{t.checkIn.how}</Text>
            <Chips options={HOW} labels={t.checkIn.hows} value={how} onChange={setHow} />
          </View>
          <View style={{ gap: 8 }}>
            <Text style={{ fontFamily: font.bodyBold, fontSize: 14, color: color.text }}>{t.checkIn.cheat}</Text>
            <Chips options={CHEAT} labels={t.checkIn.cheats} value={cheat} onChange={setCheat} warn />
            <Text style={{ fontFamily: font.body, fontSize: 12, color: color.muted }}>{t.checkIn.note}</Text>
          </View>
          <SysButton label={t.checkIn.save} onPress={save} disabled={!how && !cheat} />
          <Pressable accessibilityRole="button" onPress={close} style={{ minHeight: 40, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontFamily: font.bodyBold, fontSize: 14, color: color.muted }}>{t.checkIn.skip}</Text>
          </Pressable>
        </Frame>
      </View>
    </Modal>
  );
}
