// The question a skill asks first: do you have what it needs, or where do you do it? (game/gear.js)
import { Pressable, Text, View } from "react-native";
import { gearOf, hasGear } from "../game/gear";
import { skillById } from "../game/guild";
import { setGear } from "../lib/player";
import { useTheme } from "../theme";
import { t } from "../i18n";

const fill = (s, vars) => Object.entries(vars ?? {}).reduce((acc, [k, v]) => acc.split(`{${k}}`).join(String(v)), String(s ?? ""));

export default function GearAsk({ user, player, skill, boxed = false, showName = false }) {
  const { color, font } = useTheme();
  const g = gearOf(skill);
  if (!g) return null;
  const now = hasGear(player?.profile, skill);
  const name = skillById[skill]?.name ?? skill;
  const options = g.places ? [...g.places.map((p) => [p, t.gear.places[p]]), [false, t.gear.nowhere]] : [[true, t.gear.yes], [false, t.gear.no]];
  const question = g.places ? fill(t.gear.where, { skill: name.toLowerCase() }) : fill(t.gear.ask, { need: g.need });
  return (
    <View style={[{ gap: 8 }, boxed ? { padding: 12, borderWidth: 1, borderColor: color.gold } : null]}>
      {boxed ? <Text style={{ fontFamily: font.bold, fontSize: 11, letterSpacing: 2, color: color.gold }}>{t.gear.title}</Text> : null}
      <Text style={{ fontFamily: font.bodyMedium, fontSize: 14, lineHeight: 20, color: "#FFFFFF" }}>{showName ? `${name}: ${question}` : question}</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
        {options.map(([v, label]) => {
          const on = now === v;
          return (
            <Pressable key={String(v)} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => setGear(user.uid, skill, v).catch(() => {})}
              style={{ minHeight: 40, paddingHorizontal: 12, justifyContent: "center", borderWidth: 1, borderColor: on ? color.frame : "rgba(159,203,255,0.3)", backgroundColor: on ? "rgba(159,203,255,0.14)" : "transparent" }}>
              <Text style={{ fontFamily: font.bodyBold, fontSize: 13, color: on ? "#FFFFFF" : color.text }}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
