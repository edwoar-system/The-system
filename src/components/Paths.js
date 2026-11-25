// Paths (Learn tab): The Codex and Kaizen. A list of paths → a path's pages → the reader: the idea, one quote,
// one question. One page a day, with a daily reminder at a time you pick.
import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { PATHS, PATH_PAGE_XP, nextPage, parts, pathById, readIn } from "../game/paths";
import { readPage, readingTime, setReadingReminder } from "../lib/paths";
import { showSystem } from "../lib/popup";
import { doneFeel, tapFeel } from "../lib/haptics";
import { Frame, Label, SysButton } from "./sys";
import { useTheme } from "../theme";
import { t } from "../i18n";

const fill = (s, vars) => Object.entries(vars ?? {}).reduce((acc, [k, v]) => acc.split(`{${k}}`).join(String(v)), String(s ?? ""));
const TIMES = ["07:30", "12:30", "16:30", "20:00", "21:30"];

function Reader({ user, player, path, page, onBack, onNext }) {
  const { color, font } = useTheme();
  const [busy, setBusy] = useState(false);
  const read = !!readIn(player, path.id)[page.id];
  const i = path.pages.indexOf(page);
  async function done() {
    setBusy(true);
    try {
      const r = await readPage(user.uid, player, path.id, page.id);
      doneFeel();
      if (r.first) showSystem({ title: t.paths.readTitle, lines: [page.title, fill(t.paths.readLine, { x: r.xp })], tone: "buff" });
      onNext?.();
    } catch {
      showSystem({ title: t.paths.failed, lines: [], tone: "debuff" });
    } finally {
      setBusy(false);
    }
  }
  return (
    <View style={{ gap: 14 }}>
      <Pressable accessibilityRole="button" onPress={onBack} style={{ minHeight: 44, justifyContent: "center", alignSelf: "flex-start" }}>
        <Text style={{ fontFamily: font.bodyBold, fontSize: 14, color: color.accent }}>{`‹ ${path.name}`}</Text>
      </Pressable>
      <Text style={{ fontFamily: font.bold, fontSize: 11, letterSpacing: 3, color: color.accent }}>{fill(t.paths.pageOf, { n: i + 1, of: path.pages.length })}</Text>
      <Text accessibilityRole="header" style={{ fontFamily: font.bold, fontSize: 24, lineHeight: 30, color: "#FFFFFF" }}>{page.title}</Text>
      {page.body.map((para, k) => (
        <Text key={k} style={{ fontFamily: font.body, fontSize: 16, lineHeight: 25, color: color.text }}>
          {parts(para).map((x, j) => <Text key={j} style={x.bold ? { fontFamily: font.bodyBold, color: "#FFFFFF" } : null}>{x.text}</Text>)}
        </Text>
      ))}
      <View style={{ borderLeftWidth: 2, borderLeftColor: color.purple, paddingLeft: 14, paddingVertical: 4, gap: 6 }}>
        <Text style={{ fontFamily: font.body, fontSize: 16, lineHeight: 24, color: "#FFFFFF", fontStyle: "italic" }}>{`"${page.quote.text}"`}</Text>
        <Text style={{ fontFamily: font.body, fontSize: 12, color: color.muted }}>{page.quote.who}</Text>
      </View>
      <Frame cut={10} contentStyle={{ padding: 14, gap: 6 }}>
        <Label tone={color.accent}>{t.paths.question}</Label>
        <Text style={{ fontFamily: font.bodyMedium, fontSize: 16, lineHeight: 23, color: "#FFFFFF" }}>{page.question}</Text>
        <Text style={{ fontFamily: font.body, fontSize: 12, lineHeight: 17, color: color.muted }}>{t.paths.questionHint}</Text>
      </Frame>
      {read ? (
        <Text style={{ fontFamily: font.bodyBold, fontSize: 13, color: color.purple, textAlign: "center" }}>{t.paths.alreadyRead}</Text>
      ) : (
        <SysButton label={fill(t.paths.markRead, { x: PATH_PAGE_XP })} onPress={done} disabled={busy} />
      )}
    </View>
  );
}

export default function Paths({ user, player }) {
  const { color, font } = useTheme();
  const [open, setOpen] = useState(null); // { path, page? }
  const time = readingTime(player);

  if (open?.page) {
    const path = pathById[open.path];
    const page = path.pages.find((p) => p.id === open.page);
    return <Reader user={user} player={player} path={path} page={page} onBack={() => setOpen({ path: open.path })} onNext={() => setOpen({ path: open.path })} />;
  }
  if (open?.path) {
    const path = pathById[open.path];
    const read = readIn(player, path.id);
    const next = nextPage(player, path.id);
    return (
      <View style={{ gap: 12 }}>
        <Pressable accessibilityRole="button" onPress={() => setOpen(null)} style={{ minHeight: 44, justifyContent: "center", alignSelf: "flex-start" }}>
          <Text style={{ fontFamily: font.bodyBold, fontSize: 14, color: color.accent }}>{`‹ ${t.paths.all}`}</Text>
        </Pressable>
        <Text accessibilityRole="header" style={{ fontFamily: font.bold, fontSize: 24, color: "#FFFFFF" }}>{path.name}</Text>
        <Text style={{ fontFamily: font.body, fontSize: 14, lineHeight: 20, color: color.muted }}>{path.sub}</Text>
        {next ? <SysButton label={fill(t.paths.readNext, { title: next.title })} onPress={() => setOpen({ path: path.id, page: next.id })} /> : <Text style={{ fontFamily: font.bodyBold, fontSize: 14, color: color.purple }}>{t.paths.finished}</Text>}
        <Frame cut={12} contentStyle={{ paddingHorizontal: 14, paddingVertical: 4 }}>
          {path.pages.map((pg, i) => (
            <Pressable key={pg.id} accessibilityRole="button" onPress={() => setOpen({ path: path.id, page: pg.id })}
              style={({ pressed }) => ({ flexDirection: "row", alignItems: "center", gap: 12, minHeight: 52, borderTopWidth: i ? 1 : 0, borderTopColor: color.line, opacity: pressed ? 0.7 : 1 })}>
              <Text style={{ width: 24, fontFamily: font.num, fontSize: 15, color: read[pg.id] ? color.purple : color.muted }}>{read[pg.id] ? "✓" : i + 1}</Text>
              <Text style={{ flex: 1, fontFamily: font.bodyBold, fontSize: 15, color: read[pg.id] ? color.muted : "#FFFFFF" }}>{pg.title}</Text>
            </Pressable>
          ))}
        </Frame>
      </View>
    );
  }
  return (
    <View style={{ gap: 12 }}>
      {PATHS.map((path) => {
        const n = Object.keys(readIn(player, path.id)).length;
        return (
          <Pressable key={path.id} accessibilityRole="button" onPress={() => setOpen({ path: path.id })}>
            <Frame cut={12} contentStyle={{ padding: 14, gap: 6 }}>
              <Text style={{ fontFamily: font.bold, fontSize: 18, color: "#FFFFFF" }}>{path.name}</Text>
              <Text style={{ fontFamily: font.body, fontSize: 13, lineHeight: 18, color: color.text }}>{path.sub}</Text>
              <View style={{ height: 5, backgroundColor: "rgba(168,126,255,0.14)" }}>
                <View style={{ width: `${(n / path.pages.length) * 100}%`, height: "100%", backgroundColor: color.purple }} />
              </View>
              <Text style={{ fontFamily: font.body, fontSize: 12, color: color.muted }}>{fill(t.paths.progress, { n, of: path.pages.length })}</Text>
            </Frame>
          </Pressable>
        );
      })}
      <Frame cut={12} contentStyle={{ padding: 14, gap: 8 }}>
        <Label tone={color.hi}>{t.paths.reminderTitle}</Label>
        <Text style={{ fontFamily: font.body, fontSize: 13, lineHeight: 18, color: color.muted }}>{t.paths.reminderSub}</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
          {[null, ...TIMES].map((tm) => {
            const on = time === tm;
            return (
              <Pressable key={tm ?? "off"} accessibilityRole="radio" accessibilityState={{ checked: on }} onPress={() => { tapFeel(); setReadingReminder(user.uid, player, tm).catch(() => {}); }}
                style={({ pressed }) => ({ minHeight: 40, paddingHorizontal: 12, justifyContent: "center", borderWidth: 1, borderColor: on ? color.frame : "rgba(159,203,255,0.22)",
                  backgroundColor: pressed ? "rgba(159,203,255,0.2)" : on ? "rgba(159,203,255,0.14)" : "transparent" })}>
                <Text style={{ fontFamily: font.bodyBold, fontSize: 13, color: on ? "#FFFFFF" : color.text }}>{tm ?? t.paths.off}</Text>
              </Pressable>
            );
          })}
        </View>
      </Frame>
    </View>
  );
}
