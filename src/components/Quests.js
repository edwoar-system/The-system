import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { completeQuest, currentDay, rewardPreview } from "../lib/day";
import { questById, SIDE_QUESTS } from "../game/quests";
import { ECONOMY } from "../game/economy";
import { Button, Panel, glow } from "./ui";
import { useTheme } from "../theme";
import { t } from "../i18n";

const fill = (s, vars) => Object.entries(vars).reduce((acc, [k, v]) => acc.split(`{${k}}`).join(String(v)), s);

function QuestRow({ questId, done, onDone, busy }) {
  const { color, font } = useTheme();
  const q = questById[questId];
  return (
    <View style={{ gap: 8, paddingVertical: 10, borderTopWidth: 1, borderTopColor: color.line, opacity: done ? 0.55 : 1 }}>
      <Text style={{ fontFamily: font.bodyMedium, fontSize: 16, lineHeight: 22, color: color.text }}>{q.title}</Text>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <Text style={{ fontFamily: font.display, fontSize: 13, color: color.accent }}>{q.stat}</Text>
        <Text style={{ fontFamily: font.body, fontSize: 13, color: color.muted }}>
          {fill(t.quests.min, { m: q.minutes })} · {t.quests.difficulty[q.difficulty]}
        </Text>
      </View>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <Text style={{ fontFamily: font.display, fontSize: 14, color: done ? color.muted : color.reward }}>
          {done ? t.quests.completed : fill(t.quests.reward, onDone.preview)}
        </Text>
        {!done ? <Button label={t.quests.done} onPress={onDone.run} disabled={busy} style={{ paddingVertical: 10, minWidth: 96 }} /> : null}
      </View>
    </View>
  );
}

export default function Quests({ user, player }) {
  const theme = useTheme();
  const { color, font } = theme;
  const insets = useSafeAreaInsets();
  const day = currentDay(player, user.uid);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);

  const mainsDone = day.mains.filter((m) => m.done).length;

  function action(questId, slot) {
    return {
      preview: rewardPreview(day, questId),
      run: async () => {
        setBusy(true);
        try {
          const r = await completeQuest(user.uid, questId, slot);
          const line = r.bonus
            ? fill(t.quests.earnedBonus, { coins: r.coins + r.bonus, bonus: r.bonus, xp: r.xp })
            : fill(t.quests.earned, { coins: r.coins, xp: r.xp });
          setToast({ line, level: r.levelUp ? fill(t.quests.levelUp, { level: r.levelUp }) : null });
        } catch (e) {
          if (e.message !== "already-done") setToast({ line: t.quests.error, error: true });
        } finally {
          setBusy(false);
        }
      },
    };
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: color.bg }}
      contentContainerStyle={{ padding: 24, paddingTop: insets.top + 24, paddingBottom: 40, gap: 20, maxWidth: 520, width: "100%", alignSelf: "center" }}>
      <Text style={{ fontFamily: font.displayHeavy, fontSize: 30, color: color.text }}>{t.quests.today}</Text>

      {toast ? (
        <Panel>
          <Text style={{ fontFamily: font.display, fontSize: 17, color: toast.error ? color.danger : color.reward, ...(toast.error ? {} : glow(theme, "rgba(245,201,106,0.4)")) }}>
            {toast.line}
          </Text>
          {toast.level ? <Text style={{ fontFamily: font.display, fontSize: 17, color: color.accent }}>{toast.level}</Text> : null}
        </Panel>
      ) : null}

      <Panel title={t.quests.startTitle}>
        <QuestRow questId="start" done={day.start.done} busy={busy} onDone={action("start", "start")} />
      </Panel>

      <Panel title={t.quests.mainTitle}>
        <Text style={{ fontFamily: font.body, fontSize: 14, lineHeight: 20, color: color.muted }}>{t.quests.mainHint}</Text>
        {day.mains.map((m) => (
          <QuestRow key={m.id} questId={m.id} done={m.done} busy={busy} onDone={action(m.id, "main")} />
        ))}
        <Text style={{ fontFamily: font.bodyMedium, fontSize: 14, color: day.bonusPaid ? color.reward : color.muted, marginTop: 4 }}>
          {fill(t.quests.progress, { done: mainsDone, total: day.mains.length })} ·{" "}
          {day.bonusPaid
            ? fill(t.quests.bonusPaid, { bonus: Math.round(day.mainCoins * ECONOMY.allMainsBonus) })
            : fill(t.quests.bonusOpen, { pct: Math.round(ECONOMY.allMainsBonus * 100) })}
        </Text>
      </Panel>

      <Panel title={t.quests.sideTitle}>
        <Text style={{ fontFamily: font.body, fontSize: 14, lineHeight: 20, color: color.muted }}>{t.quests.sideHint}</Text>
        {SIDE_QUESTS.map((q) => (
          <QuestRow key={q.id} questId={q.id} done={false} busy={busy} onDone={action(q.id, "side")} />
        ))}
      </Panel>
    </ScrollView>
  );
}
