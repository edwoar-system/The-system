// Your to-dos on the quest screen: add one in a line, tick it off, it rolls over until it's done.
import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { todayKey } from "../game/quests";
import { TODO_COINS, TODO_PAID_PER_DAY, paidToday, todosLater, todosToday } from "../game/todos";
import { addTodo, removeTodo, toggleTodo } from "../lib/todos";
import { doneFeel, tapFeel } from "../lib/haptics";
import { Frame, HexCheck, Label } from "./sys";
import { useTheme } from "../theme";
import { t } from "../i18n";

const fill = (s, vars) => Object.entries(vars ?? {}).reduce((acc, [k, v]) => acc.split(`{${k}}`).join(String(v)), String(s ?? ""));

export default function Todos({ user, player }) {
  const { color, font } = useTheme();
  const [text, setText] = useState("");
  const [tomorrow, setTomorrow] = useState(false);
  const today = todayKey();
  const list = todosToday(player, today);
  const later = todosLater(player, today);
  const left = Math.max(0, TODO_PAID_PER_DAY - paidToday(player, today));

  function add() {
    const v = text.trim();
    if (!v) return;
    setText("");
    tapFeel();
    addTodo(user.uid, v, tomorrow ? todayKey(new Date(Date.now() + 86400000)) : today).catch(() => {});
  }

  return (
    <Frame cut={12} contentStyle={{ paddingVertical: 4 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", paddingHorizontal: 14, paddingTop: 10, paddingBottom: 6 }}>
        <Label tone={color.hi}>{t.todos.title}</Label>
        <Text style={{ fontFamily: font.body, fontSize: 12, color: color.muted }}>{left ? fill(t.todos.pays, { c: TODO_COINS, n: left }) : t.todos.paysDone}</Text>
      </View>
      {list.map((x) => (
        <View key={x.id} style={{ flexDirection: "row", alignItems: "center", gap: 10, minHeight: 50, paddingLeft: 14, paddingRight: 8, borderTopWidth: 1, borderTopColor: color.line }}>
          <Pressable accessibilityRole="button" accessibilityLabel={fill(t.todos.remove, { title: x.title })} onLongPress={() => removeTodo(user.uid, x.id).catch(() => {})} style={{ flex: 1, gap: 1 }}>
            <Text style={{ fontFamily: font.bodyMedium, fontSize: 15, lineHeight: 20, color: x.done ? color.muted : color.text, textDecorationLine: x.done ? "line-through" : "none" }}>{x.title}</Text>
            {!x.done && x.date < today ? <Text style={{ fontFamily: font.body, fontSize: 11, color: color.muted }}>{t.todos.fromBefore}</Text> : null}
          </Pressable>
          <HexCheck size={30} done={x.done} onPress={() => toggleTodo(user.uid, x.id).then((r) => { if (r?.done) doneFeel(); }).catch(() => {})}
            label={fill(x.done ? t.board.isDone : t.board.markDone, { title: x.title })} />
        </View>
      ))}
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: list.length ? 1 : 0, borderTopColor: color.line }}>
        <TextInput value={text} onChangeText={setText} onSubmitEditing={add} returnKeyType="done" placeholder={t.todos.placeholder} placeholderTextColor="#5A6A8A" maxLength={80}
          accessibilityLabel={t.todos.placeholder}
          style={{ flex: 1, minHeight: 44, paddingHorizontal: 10, fontFamily: font.body, fontSize: 15, color: "#FFFFFF", borderWidth: 1, borderColor: "rgba(159,203,255,0.3)", backgroundColor: "rgba(5,10,24,0.7)" }} />
        <Pressable accessibilityRole="switch" accessibilityState={{ checked: tomorrow }} onPress={() => setTomorrow((v) => !v)}
          style={{ minHeight: 44, paddingHorizontal: 10, justifyContent: "center", borderWidth: 1, borderColor: tomorrow ? color.frame : "rgba(159,203,255,0.3)" }}>
          <Text style={{ fontFamily: font.bodyBold, fontSize: 12, color: tomorrow ? "#FFFFFF" : color.muted }}>{tomorrow ? t.todos.tomorrow : t.todos.today}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={t.todos.add} onPress={add} disabled={!text.trim()}
          style={{ width: 44, minHeight: 44, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: color.frame, opacity: text.trim() ? 1 : 0.4 }}>
          <Text style={{ fontFamily: font.bold, fontSize: 20, color: "#FFFFFF" }}>+</Text>
        </Pressable>
      </View>
      {later.length ? <Text style={{ paddingHorizontal: 14, paddingBottom: 10, fontFamily: font.body, fontSize: 12, color: color.muted }}>{fill(t.todos.later, { n: later.length })}</Text> : null}
    </Frame>
  );
}
