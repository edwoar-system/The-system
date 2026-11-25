// A course page: how far you are, cards due for review, and every set in order (done, the one you're on, locked).
import { useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { courseStats, currentSet, dueCards, isOpen, setPassed } from "../game/courses";
import { dayNum } from "../game/skills";
import { todayKey } from "../game/quests";
import { useCourse } from "../lib/courses";
import Lesson from "./Lesson";
import { Frame, Glow, Label, SysButton } from "./sys";
import { useTheme } from "../theme";
import { t } from "../i18n";

const fill = (s, vars) => Object.entries(vars ?? {}).reduce((acc, [k, v]) => acc.split(`{${k}}`).join(String(v)), String(s ?? ""));

export default function Course({ user, course, onClose }) {
  const { color, font } = useTheme();
  const insets = useSafeAreaInsets();
  const progress = useCourse(user.uid, course.id);
  const [lesson, setLesson] = useState(null); // { set } | { review: [items] }
  if (!progress) return null;
  const st = courseStats(course, progress);
  const cur = currentSet(course, progress);
  const due = dueCards(course, progress, dayNum(todayKey()));
  const stages = course.stages;

  return (
    <Modal animationType="slide" visible onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: color.bg }}>
        <ScrollView contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 40, paddingHorizontal: 14, maxWidth: 520, width: "100%", alignSelf: "center", gap: 12 }}>
          <Glow height={360} at={0.18} />
          <Pressable accessibilityRole="button" onPress={onClose} style={{ minHeight: 44, justifyContent: "center", alignSelf: "flex-start" }}>
            <Text style={{ fontFamily: font.bodyBold, fontSize: 14, color: color.accent }}>{`‹ ${t.learn.title}`}</Text>
          </Pressable>
          <Text accessibilityRole="header" style={{ textAlign: "center", fontFamily: font.bold, fontSize: 26, color: "#FFFFFF" }}>{fill(t.course.title, { name: course.name })}</Text>
          <Text style={{ textAlign: "center", fontFamily: font.body, fontSize: 13, lineHeight: 18, color: color.muted }}>{t.course.how}</Text>

          <Frame cut={12} contentStyle={{ padding: 14, gap: 10 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
              <Label tone={color.hi}>{t.course.progress}</Label>
              <Text style={{ fontFamily: font.num, fontSize: 14, color: color.text }}>{fill(t.course.learned, { n: st.learned, of: st.total })}</Text>
            </View>
            <View style={{ height: 6, backgroundColor: "rgba(159,203,255,0.1)" }}>
              <View style={{ width: `${(st.learned / st.total) * 100}%`, height: "100%", backgroundColor: color.purple }} />
            </View>
            {cur ? <SysButton label={fill(t.course.continue, { n: course.sets.indexOf(cur) + 1 })} onPress={() => setLesson({ set: cur })} /> : <Text style={{ fontFamily: font.bodyBold, fontSize: 14, color: color.purple }}>{t.course.allDone}</Text>}
            {due.length ? (
              <Pressable accessibilityRole="button" onPress={() => setLesson({ review: due })}
                style={({ pressed }) => ({ minHeight: 48, justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: color.frame, backgroundColor: pressed ? "rgba(159,203,255,0.15)" : "rgba(159,203,255,0.06)" })}>
                <Text style={{ fontFamily: font.bold, fontSize: 13, letterSpacing: 1, color: "#FFFFFF" }}>{fill(t.course.reviewDue, { n: due.length })}</Text>
              </Pressable>
            ) : st.passed ? <Text style={{ fontFamily: font.body, fontSize: 12, color: color.muted }}>{t.course.noReview}</Text> : null}
          </Frame>

          {stages.map((stage) => {
            const sets = course.sets.filter((s) => s.stage === stage);
            return (
              <Frame key={stage} cut={12} contentStyle={{ paddingHorizontal: 14, paddingTop: 12, paddingBottom: 6 }}>
                <Label tone={color.hi}>{t.course.stages[stage]}</Label>
                {sets.map((s) => {
                  const n = course.sets.indexOf(s) + 1;
                  const passed = setPassed(progress, s.id);
                  const open = isOpen(course, progress, s.id);
                  return (
                    <Pressable key={s.id} accessibilityRole="button" disabled={!open} onPress={() => setLesson({ set: s })}
                      style={({ pressed }) => ({ minHeight: 52, flexDirection: "row", alignItems: "center", gap: 12, borderTopWidth: 1, borderTopColor: color.line, opacity: open ? (pressed ? 0.7 : 1) : 0.4 })}>
                      <Text style={{ width: 26, fontFamily: font.num, fontSize: 13, color: passed ? color.purple : color.muted }}>{passed ? "✓" : n}</Text>
                      <View style={{ flex: 1, paddingVertical: 8, gap: 2 }}>
                        <Text numberOfLines={1} style={{ fontSize: 17, color: "#FFFFFF" }}>{s.items.map((it) => it.front).slice(0, s.stage === "words" ? 4 : 10).join(s.stage === "words" ? ", " : " ")}{s.stage === "words" && s.items.length > 4 ? " …" : ""}</Text>
                        <Text style={{ fontFamily: font.body, fontSize: 12, color: color.muted }}>
                          {s.theme ? `${t.course.themes[s.theme]} · ` : ""}{fill(t.course.cards, { n: s.items.length })}{passed ? ` · ${t.course.passed}` : open ? ` · ${t.course.open}` : ""}
                        </Text>
                      </View>
                      {open ? <Text style={{ fontFamily: font.bold, fontSize: 18, color: color.muted }}>›</Text> : null}
                    </Pressable>
                  );
                })}
              </Frame>
            );
          })}
        </ScrollView>
        {lesson ? <Lesson user={user} course={course} set={lesson.set ?? null} review={lesson.review ?? null} onClose={() => setLesson(null)} /> : null}
      </View>
    </Modal>
  );
}
