// First quests: what a new player sees instead of the quest board until the System knows them.
// Six steps, 5 coins each; when all are cleared, today's real quests are built from the answers.
import { useEffect, useRef, useState } from "react";
import { Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FIRST_COINS, FIRST_QUESTS, FIRST_TOTAL, firstCleared, firstToPay } from "../game/firstQuests";
import { claimFirst, skipFirst } from "../lib/firstQuests";
import { setPlayerName } from "../lib/player";
import { showSystem } from "../lib/popup";
import { clearFeel, tapFeel } from "../lib/haptics";
import Tune, { saveDayDefaults } from "./Tune";
import { partsDone } from "../game/profile";
import Schedule from "./Schedule";
import { MsgBox, bracket } from "./Scenario";
import { Coins, Frame, HexCheck, SysButton } from "./sys";
import { useTheme } from "../theme";
import { t } from "../i18n";

const fill = (s, vars) => Object.entries(vars ?? {}).reduce((acc, [k, v]) => acc.split(`{${k}}`).join(String(v)), String(s ?? ""));
const TUNE_PART = { skills: ["goals", "interests"], day: "day", energy: "energy" };

// A full-screen page for one step (Tune part or name), with a Done button.
function StepPage({ title, children, onClose }) {
  const { color, font } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal animationType="slide" visible onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: color.bg }}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 40, paddingHorizontal: 14, gap: 14, maxWidth: 520, width: "100%", alignSelf: "center" }}>
          <Text accessibilityRole="header" style={{ fontFamily: font.bold, fontSize: 22, lineHeight: 28, color: "#FFFFFF" }}>{title}</Text>
          {children}
          <SysButton label={t.first.done} onPress={onClose} />
        </ScrollView>
      </View>
    </Modal>
  );
}

function NameStep({ user, player, onClose }) {
  const { color, font } = useTheme();
  const [name, setName] = useState(player.name ?? "");
  const save = () => { if (name.trim()) setPlayerName(user.uid, name.trim()).catch(() => {}); onClose(); };
  return (
    <StepPage title={t.first.q.name.title} onClose={save}>
      <TextInput value={name} onChangeText={setName} placeholder={t.welcome.namePh} placeholderTextColor="#4A5A7A" maxLength={24} autoCapitalize="words" autoFocus
        accessibilityLabel={t.welcome.namePh} onSubmitEditing={save} returnKeyType="done"
        style={{ minHeight: 50, paddingHorizontal: 14, fontFamily: font.bodyBold, fontSize: 18, color: "#FFFFFF", borderWidth: 1, borderColor: color.frame, backgroundColor: "rgba(5,10,24,0.7)" }} />
    </StepPage>
  );
}

export default function FirstQuests({ user, player, onOpenAssess }) {
  const { color, font } = useTheme();
  const [open, setOpen] = useState(null);
  const claiming = useRef(false);
  const cleared = FIRST_QUESTS.filter((q) => firstCleared(player, q)).length;
  const toPay = firstToPay(player).join(",");

  // Pay each cleared step once no page is open (so the System message is seen).
  useEffect(() => {
    if (!toPay || open || claiming.current) return;
    claiming.current = true;
    claimFirst(user.uid).then((r) => {
      if (!r) return;
      clearFeel();
      if (r.allDone) showSystem({ title: t.first.allTitle, lines: [t.first.allLine1, t.first.allLine2, fill(t.first.allCoins, { n: FIRST_TOTAL })], tone: "buff" });
      else showSystem({ title: r.paid.length === 1 ? fill(t.first.clearedOne, { title: t.first.q[r.paid[0]].title }) : fill(t.first.clearedMany, { n: r.paid.length }), lines: [fill(t.first.coins, { n: r.coins })], tone: "buff" });
    }).catch(() => {}).finally(() => { claiming.current = false; });
  }, [toPay, open, user.uid]);

  function start(id) {
    tapFeel();
    if (id === "maxes") onOpenAssess?.();
    else setOpen(id);
  }

  return (
    <View style={{ marginTop: 12, marginHorizontal: 14, gap: 6 }}>
      <MsgBox text={bracket(t.first.arrived)} strong />
      <MsgBox text={bracket(t.first.why)} delay={200} />
      <Frame cut={14} kind="premium" style={{ marginTop: 6 }} contentStyle={{ paddingVertical: 6 }}>
        <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: 14, paddingTop: 10, paddingBottom: 6, gap: 10 }}>
          <Text style={{ flex: 1, fontFamily: font.bold, fontSize: 12, letterSpacing: 2, color: color.hi }}>{fill(t.first.progress, { n: cleared, of: FIRST_QUESTS.length })}</Text>
          <Coins value={FIRST_TOTAL} sign="+" size={14} />
        </View>
        {FIRST_QUESTS.map((q, i) => {
          const done = firstCleared(player, q);
          const tx = t.first.q[q.id];
          return (
            <View key={q.id} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10, paddingLeft: 14, paddingRight: 8, opacity: done ? 0.55 : 1,
              borderTopWidth: 1, borderTopColor: color.line }}>
              <Text style={{ width: 22, fontFamily: font.num, fontSize: 15, color: done ? color.purple : color.accent }}>{i + 1}</Text>
              <Pressable accessibilityRole="button" disabled={done} onPress={() => start(q.id)} style={({ pressed }) => ({ flex: 1, gap: 3, opacity: pressed ? 0.7 : 1 })}>
                <Text style={{ fontFamily: font.bold, fontSize: 15, lineHeight: 20, color: "#FFFFFF" }}>{tx.title}</Text>
                {done ? null : <Text style={{ fontFamily: font.body, fontSize: 12, lineHeight: 17, color: color.muted }}>{tx.why}</Text>}
                {!done && q.skippable ? (
                  <Pressable accessibilityRole="button" hitSlop={8} onPress={() => skipFirst(user.uid, q.id).catch(() => {})} style={{ alignSelf: "flex-start", paddingVertical: 4 }}>
                    <Text style={{ fontFamily: font.bodyBold, fontSize: 12, color: color.accent }}>{tx.skip}</Text>
                  </Pressable>
                ) : null}
              </Pressable>
              {done ? null : <Coins value={FIRST_COINS} sign="+" size={13} />}
              <HexCheck size={32} done={done} disabled={done} onPress={() => start(q.id)} label={tx.title} />
            </View>
          );
        })}
      </Frame>

      {open === "name" ? <NameStep user={user} player={player} onClose={() => setOpen(null)} /> : null}
      {TUNE_PART[open] ? (
        <StepPage title={t.first.q[open].title} onClose={() => {
          // The times shown count as an answer, even if you didn't change them.
          if (open === "day" && !partsDone(player.profile).day) saveDayDefaults(user.uid, player.profile).catch(() => {});
          setOpen(null);
        }}>
          <Tune user={user} player={player} only={TUNE_PART[open]} />
        </StepPage>
      ) : null}
      {open === "busy" ? <Schedule user={user} player={player} onClose={() => setOpen(null)} /> : null}
    </View>
  );
}
