// "I did something": pick the skill, how hard it was (play, train, push) and roughly how long. Rules in game/didit.js.
import { useState } from "react";
import { Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { DID_LEVELS, DID_ORDER, didId, didQuest, didSkills, openQuestFor } from "../game/didit";
import { searchSkills } from "../game/goals";
import { skillById } from "../game/guild";
import { questCoins, questXp } from "../game/economy";
import { completeQuest, currentDay, getQuest } from "../lib/day";
import { doneFeel, tapFeel } from "../lib/haptics";
import { Coins, Label, SysButton } from "./sys";
import { useTheme } from "../theme";
import { t } from "../i18n";

const fill = (s, vars) => Object.entries(vars ?? {}).reduce((acc, [k, v]) => acc.split(`{${k}}`).join(String(v)), String(s ?? ""));

function Chip({ label, on, onPress, wide }) {
  const { color, font } = useTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected: !!on }} onPress={onPress}
      style={{ flex: wide ? 1 : undefined, minHeight: 42, paddingHorizontal: 12, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: on ? color.frame : "rgba(159,203,255,0.24)", backgroundColor: on ? "rgba(159,203,255,0.16)" : "transparent" }}>
      <Text style={{ fontFamily: font.bodyBold, fontSize: 13, color: on ? "#FFFFFF" : color.text }}>{label}</Text>
    </Pressable>
  );
}

export default function DidIt({ user, player, onClose, onDone }) {
  const { color, font } = useTheme();
  const insets = useSafeAreaInsets();
  const [skill, setSkill] = useState(null);
  const [level, setLevel] = useState("play");
  const [minutes, setMinutes] = useState(DID_LEVELS.play.def);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const mine = didSkills(player);
  const found = searchSkills(q);
  const day = currentDay(player, user.uid);
  const open = skill && level !== "play" ? openQuestFor(day, skill, (id) => getQuest(id, player)) : null;
  const preview = skill ? didQuest(didId(skill, level, minutes)) : null;
  const reward = preview ? { coins: questCoins(preview), xp: questXp(preview) } : null;

  function pickLevel(l) { setLevel(l); setMinutes(DID_LEVELS[l].def); }
  async function save() {
    if (!skill || busy) return;
    setBusy(true);
    setError(false);
    const id = open ? open.id : didId(skill, level, minutes);
    try {
      const r = await completeQuest(user.uid, id, open ? open.slot : "did");
      doneFeel();
      onDone?.(r, id);
    } catch {
      setError(true);
      setBusy(false);
    }
  }

  return (
    <Modal transparent animationType="slide" visible onRequestClose={onClose}>
      <Pressable accessibilityLabel={t.did.close} onPress={onClose} style={{ flex: 1, backgroundColor: "rgba(1,4,10,0.6)" }} />
      <View style={{ maxHeight: "86%", backgroundColor: color.bg, borderTopWidth: 1, borderColor: color.frame }}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 20, gap: 12, maxWidth: 520, width: "100%", alignSelf: "center" }}>
          <Text accessibilityRole="header" style={{ fontFamily: font.bold, fontSize: 18, color: "#FFFFFF", textAlign: "center" }}>{t.did.title}</Text>

          {!skill ? (
            <>
              {mine.length ? <Label tone={color.hi}>{t.did.yours}</Label> : null}
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                {mine.slice(0, 15).map((id) => <Chip key={id} label={skillById[id].name} onPress={() => { tapFeel(); setSkill(id); }} />)}
              </View>
              <TextInput value={q} onChangeText={setQ} placeholder={t.did.search} placeholderTextColor={color.muted} accessibilityLabel={t.did.search}
                style={{ minHeight: 44, paddingHorizontal: 12, fontFamily: font.body, fontSize: 15, color: "#FFFFFF", borderWidth: 1, borderColor: "rgba(159,203,255,0.3)", backgroundColor: "rgba(5,10,24,0.7)" }} />
              {found.length ? (
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                  {found.map((id) => <Chip key={id} label={skillById[id].name} onPress={() => { tapFeel(); setSkill(id); }} />)}
                </View>
              ) : null}
            </>
          ) : (
            <>
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <Text style={{ fontFamily: font.bold, fontSize: 20, color: "#FFFFFF" }}>{skillById[skill].name}</Text>
                <Pressable accessibilityRole="button" onPress={() => setSkill(null)} hitSlop={8} style={{ minHeight: 40, justifyContent: "center" }}>
                  <Text style={{ fontFamily: font.bodyBold, fontSize: 13, color: color.muted }}>{t.did.change}</Text>
                </Pressable>
              </View>
              {DID_ORDER.map((l) => {
                const on = level === l;
                return (
                  <Pressable key={l} accessibilityRole="radio" accessibilityState={{ checked: on }} onPress={() => { tapFeel(); pickLevel(l); }}
                    style={{ padding: 12, gap: 2, borderWidth: 1, borderColor: on ? color.frame : "rgba(159,203,255,0.2)", backgroundColor: on ? "rgba(159,203,255,0.12)" : "transparent" }}>
                    <Text style={{ fontFamily: font.bold, fontSize: 15, color: on ? "#FFFFFF" : color.text }}>{t.did.levels[l]}</Text>
                    <Text style={{ fontFamily: font.body, fontSize: 12, lineHeight: 17, color: color.muted }}>{t.did.levelSub[l]}</Text>
                  </Pressable>
                );
              })}
              <Label tone={color.hi}>{t.did.howLong}</Label>
              <View style={{ flexDirection: "row", gap: 6 }}>
                {DID_LEVELS[level].minutes.map((m) => <Chip key={m} wide label={fill(t.did.min, { n: m })} on={minutes === m} onPress={() => setMinutes(m)} />)}
              </View>
              {open ? <Text style={{ fontFamily: font.bodyMedium, fontSize: 13, lineHeight: 18, color: color.gold }}>{fill(t.did.counts, { quest: open.title })}</Text> : null}
              {reward && !open ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <Coins value={reward.coins} sign="+" size={15} />
                  <Text style={{ fontFamily: font.num, fontSize: 14, color: color.accent }}>{`+${reward.xp} EXP`}</Text>
                </View>
              ) : null}
              {error ? <Text style={{ fontFamily: font.body, fontSize: 13, color: color.dangerSoft }}>{t.did.failed}</Text> : null}
              <SysButton label={busy ? t.did.saving : t.did.save} onPress={save} disabled={busy} />
            </>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}
