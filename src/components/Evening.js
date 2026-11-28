// The evening journal on the quest screen: today's log is already filled in, you add three short lines.
import { useState } from "react";
import { Text, TextInput, View } from "react-native";
import { JOURNAL_COINS } from "../game/journal";
import { saveJournal } from "../lib/journal";
import { doneFeel } from "../lib/haptics";
import { Coins, Frame, Label, SysButton } from "./sys";
import { useTheme } from "../theme";
import { t } from "../i18n";

const fill = (s, vars) => Object.entries(vars ?? {}).reduce((acc, [k, v]) => acc.split(`{${k}}`).join(String(v)), String(s ?? ""));

function Line({ label, value, onChange }) {
  const { color, font } = useTheme();
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontFamily: font.bodyBold, fontSize: 13, color: color.text }}>{label}</Text>
      <TextInput value={value} onChangeText={onChange} multiline accessibilityLabel={label} maxLength={500}
        style={{ minHeight: 44, paddingHorizontal: 12, paddingVertical: 10, fontFamily: font.body, fontSize: 15, lineHeight: 20, color: "#FFFFFF", borderWidth: 1, borderColor: "rgba(159,203,255,0.28)", backgroundColor: "rgba(5,10,24,0.7)" }} />
    </View>
  );
}

export default function Evening({ user, done, style }) {
  const { color, font } = useTheme();
  const [well, setWell] = useState("");
  const [better, setBetter] = useState("");
  const [tomorrow, setTomorrow] = useState("");
  const [state, setState] = useState(null); // null | "saving" | "error"
  async function save() {
    setState("saving");
    try { await saveJournal(user.uid, { well, better, tomorrow, done }); doneFeel(); } catch { setState("error"); }
  }
  return (
    <Frame cut={14} style={style} contentStyle={{ padding: 16, gap: 12 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Label tone={color.hi}>{t.evening.title}</Label>
        <Coins value={JOURNAL_COINS} sign="+" size={13} />
      </View>
      <Text style={{ fontFamily: font.bold, fontSize: 16, color: "#FFFFFF" }}>{t.evening.lead}</Text>
      <View style={{ gap: 4 }}>
        <Text style={{ fontFamily: font.bodyBold, fontSize: 12, color: color.purple }}>{fill(t.evening.today, { n: done.length })}</Text>
        {done.length ? (
          <Text style={{ fontFamily: font.body, fontSize: 13, lineHeight: 19, color: color.text }}>{done.join(", ")}</Text>
        ) : <Text style={{ fontFamily: font.body, fontSize: 13, color: color.muted }}>{t.evening.nothing}</Text>}
      </View>
      <Line label={t.evening.well} value={well} onChange={setWell} />
      <Line label={t.evening.better} value={better} onChange={setBetter} />
      <Line label={t.evening.tomorrow} value={tomorrow} onChange={setTomorrow} />
      {state === "error" ? <Text style={{ fontFamily: font.body, fontSize: 13, color: color.dangerSoft }}>{t.evening.failed}</Text> : null}
      <SysButton label={state === "saving" ? t.evening.saving : t.evening.save} onPress={save} disabled={state === "saving"} />
    </Frame>
  );
}
