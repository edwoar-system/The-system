// Under the quest board's title: where the System thinks you are and the weather, with a way to correct it.
// With location off, a single line to turn it on.
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { SITUATIONS } from "../game/situation";
import { askLocation, chooseSituation, refreshSituation, setLocationOn } from "../lib/location";
import { useTheme } from "../theme";
import { t } from "../i18n";

const fill = (s, vars) => Object.entries(vars).reduce((acc, [k, v]) => acc.split(`{${k}}`).join(String(v)), s);

export default function SituationLine({ user, player, situation, weather }) {
  const { color, font } = useTheme();
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState(null);

  async function turnOn() {
    setMsg(null);
    const p = await askLocation();
    if (p === "granted") await setLocationOn(user.uid, true).catch(() => {});
    else setMsg(p === "unavailable" ? t.fit.unavailable : t.fit.denied);
  }

  if (!player.locationOn) {
    return (
      <View style={{ alignItems: "center", marginTop: 8, paddingHorizontal: 18, gap: 4 }}>
        <Pressable accessibilityRole="button" onPress={turnOn} hitSlop={6}>
          <Text style={{ fontFamily: font.bodyBold, fontSize: 12, color: color.accent, textAlign: "center" }}>{t.fit.turnOn}</Text>
        </Pressable>
        {msg ? <Text style={{ fontFamily: font.body, fontSize: 12, color: "#F6B45A", textAlign: "center" }}>{msg}</Text> : null}
      </View>
    );
  }

  const w = weather ? fill(weather.bad ? t.fit.weatherBad : t.fit.weatherOk, { temp: Math.round(weather.temp), why: weather.bad ? t.fit.weather[weather.bad] : "" }) : null;
  return (
    <View style={{ alignItems: "center", marginTop: 8, paddingHorizontal: 18, gap: 6 }}>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={() => setOpen((o) => !o)} hitSlop={6}>
        <Text style={{ fontFamily: font.body, fontSize: 12, color: color.muted, textAlign: "center" }}>
          {situation ? fill(t.fit.youre, { where: t.fit.situations[situation] }) : t.fit.finding}
          {w ? `  ·  ${w}` : ""}
          <Text style={{ fontFamily: font.bodyBold, color: color.accent }}>{`  ${open ? t.fit.done : t.fit.change}`}</Text>
        </Text>
      </Pressable>
      {open ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, justifyContent: "center" }}>
          {[...SITUATIONS, null].map((id) => {
            const on = id === situation;
            return (
              <Pressable key={id ?? "auto"} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => { chooseSituation(id); if (!id) refreshSituation(player).catch(() => {}); setOpen(false); }}
                style={{ minHeight: 36, paddingHorizontal: 10, justifyContent: "center", borderWidth: 1, borderColor: on ? color.frame : "rgba(159,203,255,0.22)", backgroundColor: on ? "rgba(159,203,255,0.16)" : "transparent" }}>
                <Text style={{ fontFamily: font.bodyBold, fontSize: 12, color: on ? "#FFFFFF" : color.muted }}>{id ? t.fit.situationNames[id] : t.fit.auto}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}
