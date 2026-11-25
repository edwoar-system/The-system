// Rank assessment: "what can you do right now?" The System places you per skill and points you to the trial
// for that rank (placement), so experienced players don't grind from F. Numbers are saved in players/{uid}.maxes.
import { useEffect, useRef, useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { db } from "../lib/firebase";
import { ASSESS, advice } from "../game/assess";
import { skillById } from "../game/guild";
import { RANKS } from "../game/ladders";
import { interestSkills } from "../game/profile";
import { dayNum, skillView } from "../game/skills";
import { Frame, Label } from "./sys";
import { useTheme } from "../theme";
import { t } from "../i18n";

const fill = (s, vars) => Object.entries(vars ?? {}).reduce((acc, [k, v]) => acc.split(`{${k}}`).join(String(v)), String(s ?? ""));
const show = (n) => (Number.isInteger(n) ? String(n) : String(Math.round(n * 10) / 10));

function Row({ id, player, value, onChange, onTrial }) {
  const { color, font } = useTheme();
  const a = ASSESS[id];
  const v = skillView(id, player.skills?.[id], dayNum());
  const text = value == null ? "" : String(value);
  const [draft, setDraft] = useState(text);
  useEffect(() => { setDraft(text); }, [text]);
  const num = draft.trim() === "" ? null : Number(draft.replace(",", "."));
  const adv = num == null || Number.isNaN(num) ? null : advice(id, num, v.rank);
  return (
    <View style={{ paddingVertical: 12, borderTopWidth: 1, borderTopColor: color.line, gap: 8 }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: font.bodyBold, fontSize: 15, color: "#FFFFFF" }}>{skillById[id]?.name}</Text>
          <Text style={{ fontFamily: font.body, fontSize: 12, color: color.muted }}>{t.assess.units[a.unit]}</Text>
        </View>
        <TextInput value={draft} onChangeText={setDraft} onEndEditing={() => onChange(num == null || Number.isNaN(num) ? null : num)} onBlur={() => onChange(num == null || Number.isNaN(num) ? null : num)}
          keyboardType="decimal-pad" returnKeyType="done" placeholder="–" placeholderTextColor="#4A5A7A" accessibilityLabel={`${skillById[id]?.name}: ${t.assess.units[a.unit]}`}
          style={{ width: 84, minHeight: 44, textAlign: "center", fontFamily: font.num, fontSize: 18, color: "#FFFFFF", borderWidth: 1, borderColor: "rgba(159,203,255,0.35)", backgroundColor: "rgba(5,10,24,0.7)" }} />
      </View>
      {adv ? (
        <View style={{ gap: 6 }}>
          <Text style={{ fontFamily: font.bodyMedium, fontSize: 13, lineHeight: 18, color: color.text }}>
            {fill(t.assess.level, { r: RANKS[adv.rank], now: v.letter })}
            {adv.next != null ? ` ${fill(adv.close ? t.assess.close : t.assess.nextAt, { r: RANKS[adv.next], n: a.unit === "vgrade" ? `V${show(adv.need)}` : `${show(adv.need)}${t.assess.unitShort[a.unit] ? ` ${t.assess.unitShort[a.unit]}` : ""}` })}` : ` ${t.assess.top}`}
          </Text>
          {adv.kind === "trial" ? (
            <Pressable accessibilityRole="button" onPress={() => onTrial(id, adv.rank)}
              style={({ pressed }) => ({ minHeight: 42, paddingHorizontal: 12, alignSelf: "flex-start", justifyContent: "center", borderWidth: 1, borderColor: color.purple, backgroundColor: pressed ? "rgba(168,126,255,0.25)" : "rgba(168,126,255,0.1)" })}>
              <Text style={{ fontFamily: font.bold, fontSize: 12, letterSpacing: 1, color: "#FFFFFF" }}>{fill(t.assess.takeTrial, { r: RANKS[adv.rank] })}</Text>
            </Pressable>
          ) : (
            <Text style={{ fontFamily: font.body, fontSize: 12, lineHeight: 17, color: adv.close ? color.accent : color.muted }}>{adv.close ? fill(t.assess.closeTip, { r: RANKS[adv.next] }) : t.assess.trainTip}</Text>
          )}
        </View>
      ) : null}
    </View>
  );
}

export default function Assess({ user, player, onClose, onTrial }) {
  const { color, font } = useTheme();
  const insets = useSafeAreaInsets();
  const [all, setAll] = useState(false);
  const [error, setError] = useState(null);
  const liked = interestSkills(player.profile);
  const ids = Object.keys(ASSESS).filter((id) => skillById[id]);
  const yours = ids.filter((id) => liked.has(id) || player.skills?.[id] || player.maxes?.[id] != null);
  const rest = ids.filter((id) => !yours.includes(id));
  const saving = useRef(Promise.resolve());
  const save = (id, value) => {
    if ((player.maxes?.[id] ?? null) === value) return;
    saving.current = updateDoc(doc(db, "players", user.uid), { [`maxes.${id}`]: value, updatedAt: serverTimestamp() }).catch(() => setError(t.assess.failed));
  };
  const row = (id) => <Row key={id} id={id} player={player} value={player.maxes?.[id] ?? null} onChange={(v) => save(id, v)} onTrial={onTrial} />;
  return (
    <Modal animationType="slide" visible onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, backgroundColor: color.bg }}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingTop: insets.top + 10, paddingBottom: insets.bottom + 60, paddingHorizontal: 14, gap: 12, maxWidth: 520, width: "100%", alignSelf: "center" }}>
          <Pressable accessibilityRole="button" onPress={onClose} hitSlop={8} style={{ minHeight: 44, justifyContent: "center", alignSelf: "flex-start" }}>
            <Text style={{ fontFamily: font.bodyBold, fontSize: 14, color: color.accent }}>{`‹ ${t.assess.back}`}</Text>
          </Pressable>
          <Label tone={color.accent} style={{ letterSpacing: 4 }}>{t.assess.system}</Label>
          <Text accessibilityRole="header" style={{ fontFamily: font.bold, fontSize: 24, color: "#FFFFFF" }}>{t.assess.title}</Text>
          <Text style={{ fontFamily: font.body, fontSize: 14, lineHeight: 20, color: color.muted }}>{t.assess.sub}</Text>
          {error ? <Text style={{ fontFamily: font.bodyMedium, fontSize: 13, color: "#F6B45A" }}>{error}</Text> : null}
          <Frame cut={14} contentStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 }}>
            <Label tone={color.hi}>{t.assess.yours}</Label>
            {yours.length ? yours.map(row) : <Text style={{ paddingVertical: 10, fontFamily: font.body, fontSize: 13, lineHeight: 18, color: color.muted }}>{t.assess.yoursEmpty}</Text>}
          </Frame>
          <Pressable accessibilityRole="button" accessibilityState={{ expanded: all }} onPress={() => setAll((x) => !x)} style={{ minHeight: 44, justifyContent: "center" }}>
            <Text style={{ fontFamily: font.bodyBold, fontSize: 14, color: color.accent }}>{all ? t.assess.hideMore : fill(t.assess.showMore, { n: rest.length })}</Text>
          </Pressable>
          {all ? <Frame cut={14} contentStyle={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 4 }}>{rest.map(row)}</Frame> : null}
          <Text style={{ fontFamily: font.body, fontSize: 12, lineHeight: 17, color: color.muted }}>{t.assess.note}</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}
