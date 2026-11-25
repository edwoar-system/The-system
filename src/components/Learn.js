// Learn: everything to read in one place. Quotes, philosophy, languages, skill guides and the System's words,
// plus a search that falls back to Wikipedia (shown in the System's style) and, past that, the web.
import { useEffect, useState } from "react";
import { ActivityIndicator, Image, Linking, Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { QUOTES, SCHOOL_NAMES } from "../game/quotes";
import { GUILD, PHILOSOPHY, skillById } from "../game/guild";
import { HIRAGANA, KATAKANA, LANGUAGES, languageById } from "../game/learn";
import { STATS } from "../game/quests";
import { TERMS, Glossary } from "./Explain";
import { acceptQuest } from "../lib/day";
import { toggleFavQuote } from "../lib/player";
import { webSearchUrl, wikiArticle, wikiSearch } from "../lib/wiki";
import QuoteLibrary from "./QuoteLibrary";
import QuotePage from "./QuotePage";
import { Frame, Glow, Label, SysButton } from "./sys";
import { useTheme } from "../theme";
import { t } from "../i18n";

const fill = (s, vars) => Object.entries(vars).reduce((acc, [k, v]) => acc.split(`{${k}}`).join(String(v)), s);
const has = (text, q) => String(text ?? "").toLowerCase().includes(q);

// A full-screen page with a back link.
function Page({ back, title, sub, onClose, children }) {
  const { color, font } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal animationType="slide" visible onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: color.bg }}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 40, paddingHorizontal: 14, maxWidth: 560, width: "100%", alignSelf: "center", gap: 12 }}>
          <Pressable accessibilityRole="button" onPress={onClose} style={{ minHeight: 44, justifyContent: "center", alignSelf: "flex-start" }}>
            <Text style={{ fontFamily: font.bodyBold, fontSize: 14, color: color.accent }}>{`‹ ${back ?? t.learn.title}`}</Text>
          </Pressable>
          {title ? <Text accessibilityRole="header" style={{ fontFamily: font.bold, fontSize: 24, lineHeight: 30, color: "#FFFFFF" }}>{title}</Text> : null}
          {sub ? <Text style={{ fontFamily: font.body, fontSize: 14, lineHeight: 20, color: color.muted }}>{sub}</Text> : null}
          {children}
        </ScrollView>
      </View>
    </Modal>
  );
}

function Row({ title, sub, onPress, first }) {
  const { color, font } = useTheme();
  return (
    <Pressable accessibilityRole="button" onPress={onPress}
      style={({ pressed }) => ({ minHeight: 52, flexDirection: "row", alignItems: "center", gap: 12, borderTopWidth: first ? 0 : 1, borderTopColor: color.line, opacity: pressed ? 0.7 : 1 })}>
      <View style={{ flex: 1, gap: 2, paddingVertical: 9 }}>
        <Text style={{ fontFamily: font.bold, fontSize: 15, color: "#FFFFFF" }}>{title}</Text>
        {sub ? <Text numberOfLines={2} style={{ fontFamily: font.body, fontSize: 12, lineHeight: 16, color: color.muted }}>{sub}</Text> : null}
      </View>
      <Text style={{ fontFamily: font.bold, fontSize: 18, color: color.muted }}>›</Text>
    </Pressable>
  );
}

function LinkButton({ label, onPress }) {
  const { color, font } = useTheme();
  return (
    <Pressable accessibilityRole="link" onPress={onPress} style={({ pressed }) => ({ minHeight: 44, justifyContent: "center", opacity: pressed ? 0.7 : 1 })}>
      <Text style={{ fontFamily: font.bodyBold, fontSize: 14, color: color.accent }}>{label}</Text>
    </Pressable>
  );
}

// A Wikipedia article in the System's style.
function Article({ title, onClose }) {
  const { color, font } = useTheme();
  const [state, setState] = useState({ loading: true });
  useEffect(() => {
    let live = true;
    wikiArticle(title).then((a) => live && setState({ a })).catch(() => live && setState({ error: true }));
    return () => { live = false; };
  }, [title]);
  const a = state.a;
  return (
    <Page back={t.learn.title} title={a?.title ?? title} sub={a?.description} onClose={onClose}>
      {state.loading ? <ActivityIndicator color={color.accent} style={{ marginTop: 30 }} /> : null}
      {state.error ? (
        <Frame cut={12} contentStyle={{ padding: 14, gap: 8 }}>
          <Text style={{ fontFamily: font.body, fontSize: 14, lineHeight: 20, color: color.text }}>{t.learn.articleFailed}</Text>
          <LinkButton label={t.learn.searchWeb} onPress={() => Linking.openURL(webSearchUrl(title))} />
        </Frame>
      ) : null}
      {a ? (
        <>
          {a.image ? <Image source={{ uri: a.image }} accessibilityIgnoresInvertColors style={{ width: "100%", height: 200, resizeMode: "contain", backgroundColor: "rgba(159,203,255,0.05)" }} /> : null}
          {a.intro ? <Text selectable style={{ fontFamily: font.body, fontSize: 15, lineHeight: 23, color: "#DCE6F7" }}>{a.intro}</Text> : null}
          {a.sections.map((s, i) => (
            <View key={i} style={{ gap: 6, marginTop: s.level === 2 ? 8 : 0 }}>
              {s.title ? (s.level === 2 ? <Label tone={color.hi}>{s.title.toUpperCase()}</Label>
                : <Text style={{ fontFamily: font.bold, fontSize: 15, color: "#FFFFFF" }}>{s.title}</Text>) : null}
              <Text selectable style={{ fontFamily: font.body, fontSize: 14, lineHeight: 21, color: "#CAD6EC" }}>{s.text}</Text>
            </View>
          ))}
          <View style={{ borderTopWidth: 1, borderTopColor: color.line, paddingTop: 8 }}>
            <Text style={{ fontFamily: font.body, fontSize: 12, color: color.muted }}>{t.learn.fromWiki}</Text>
            <LinkButton label={t.learn.openWiki} onPress={() => Linking.openURL(a.url)} />
            <LinkButton label={t.learn.searchWeb} onPress={() => Linking.openURL(webSearchUrl(a.title))} />
          </View>
        </>
      ) : null}
    </Page>
  );
}

function KanaGrid({ list }) {
  const { color, font } = useTheme();
  return (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4 }}>
      {list.map(([k, r], i) => (
        <View key={k || `gap${i}`} style={{ width: "18.5%", minHeight: 58, paddingVertical: 6, alignItems: "center", borderWidth: 1, borderColor: k ? "rgba(159,203,255,0.2)" : "transparent" }}>
          <Text style={{ fontSize: 24, color: "#FFFFFF" }}>{k}</Text>
          <Text style={{ fontFamily: font.body, fontSize: 11, color: color.muted }}>{r}</Text>
        </View>
      ))}
    </View>
  );
}

function LanguagePage({ id, onClose, onWiki, onOpenSkill }) {
  const { color, font } = useTheme();
  const l = languageById[id];
  const [kana, setKana] = useState("hira");
  return (
    <Page title={l.name} sub={l.intro} onClose={onClose}>
      <Frame cut={12} contentStyle={{ padding: 14, gap: 8 }}>
        <Label tone={color.hi}>{t.learn.howToStart}</Label>
        {l.steps.map((s, i) => (
          <View key={i} style={{ flexDirection: "row", gap: 10 }}>
            <Text style={{ fontFamily: font.num, fontSize: 14, color: color.accent, width: 16 }}>{i + 1}</Text>
            <Text style={{ flex: 1, fontFamily: font.body, fontSize: 14, lineHeight: 20, color: color.text }}>{s}</Text>
          </View>
        ))}
      </Frame>
      {l.kana ? (
        <Frame cut={12} contentStyle={{ padding: 14, gap: 10 }}>
          <View style={{ flexDirection: "row", gap: 6 }}>
            {[["hira", t.learn.hiragana], ["kata", t.learn.katakana]].map(([k, label]) => (
              <Pressable key={k} accessibilityRole="tab" accessibilityState={{ selected: kana === k }} onPress={() => setKana(k)}
                style={{ flex: 1, minHeight: 40, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: kana === k ? color.frame : "rgba(159,203,255,0.22)", backgroundColor: kana === k ? "rgba(159,203,255,0.16)" : "transparent" }}>
                <Text style={{ fontFamily: font.bold, fontSize: 13, color: kana === k ? "#FFFFFF" : color.muted }}>{label}</Text>
              </Pressable>
            ))}
          </View>
          <KanaGrid list={kana === "hira" ? HIRAGANA : KATAKANA} />
        </Frame>
      ) : null}
      {(l.tables ?? []).map((tb) => (
        <Frame key={tb.title} cut={12} contentStyle={{ padding: 14, gap: 6 }}>
          <Label tone={color.hi}>{tb.title.toUpperCase()}</Label>
          {tb.rows.map(([a, b]) => (
            <View key={a} style={{ flexDirection: "row", gap: 10 }}>
              <Text style={{ width: 130, fontFamily: a.length <= 2 ? undefined : font.bodyBold, fontSize: a.length <= 2 ? 22 : 14, color: "#FFFFFF" }}>{a}</Text>
              <Text style={{ flex: 1, fontFamily: font.body, fontSize: 14, color: color.muted }}>{b}</Text>
            </View>
          ))}
        </Frame>
      ))}
      {l.phrases.length ? (
        <Frame cut={12} contentStyle={{ padding: 14, gap: 8 }}>
          <Label tone={color.hi}>{t.learn.phrases}</Label>
          {l.phrases.map(([a, r, m]) => (
            <View key={a} style={{ gap: 1 }}>
              <Text style={{ fontFamily: font.bodyBold, fontSize: 15, color: "#FFFFFF" }}>{a}{r ? <Text style={{ fontFamily: font.body, fontSize: 13, color: color.accent }}>{`  ${r}`}</Text> : null}</Text>
              <Text style={{ fontFamily: font.body, fontSize: 13, color: color.muted }}>{m}</Text>
            </View>
          ))}
        </Frame>
      ) : null}
      {l.skill && onOpenSkill ? <SysButton label={fill(t.learn.trainIt, { name: l.name.toUpperCase() })} onPress={() => onOpenSkill(l.skill)} /> : null}
      <LinkButton label={fill(t.learn.readMore, { what: l.wiki })} onPress={() => onWiki(l.wiki)} />
    </Page>
  );
}

function PhilosophyPage({ id, user, player, onClose, onWiki, onGoToQuest }) {
  const { color, font } = useTheme();
  const p = PHILOSOPHY.find((x) => x.id === id);
  const next = player.philosophy?.[p.id] ?? 0;
  const [msg, setMsg] = useState(null);
  async function start() {
    const questId = `g:philo:${p.id}:${next}`;
    try {
      await acceptQuest(user.uid, questId);
      onGoToQuest?.({ id: questId, slot: "guild" });
    } catch (e) {
      setMsg(e.message === "already-on-board" ? t.learn.onBoard : e.message === "board-full" ? t.learn.boardFull : t.learn.failed);
    }
  }
  return (
    <Page title={p.name} sub={p.who} onClose={onClose}>
      <Frame cut={12} contentStyle={{ paddingHorizontal: 14, paddingVertical: 6 }}>
        {p.readings.map(([title, source, intro, question], i) => (
          <View key={title} style={{ paddingVertical: 10, gap: 3, borderTopWidth: i ? 1 : 0, borderTopColor: color.line, opacity: i < next ? 0.6 : 1 }}>
            <Text style={{ fontFamily: font.bold, fontSize: 15, color: "#FFFFFF" }}>{i < next ? "✓ " : ""}{title}</Text>
            <Text style={{ fontFamily: font.body, fontSize: 12, color: color.accent }}>{source}</Text>
            <Text style={{ fontFamily: font.body, fontSize: 14, lineHeight: 20, color: color.text }}>{intro}</Text>
            <Text style={{ fontFamily: font.body, fontSize: 13, lineHeight: 18, color: color.muted }}>{question}</Text>
          </View>
        ))}
      </Frame>
      {next < p.readings.length ? <SysButton label={fill(t.learn.readNext, { n: next + 1 })} onPress={start} /> : <Text style={{ fontFamily: font.bodyBold, fontSize: 14, color: color.purple }}>{t.learn.allRead}</Text>}
      {msg ? <Text style={{ fontFamily: font.bodyMedium, fontSize: 13, color: color.accent }}>{msg}</Text> : null}
      <LinkButton label={fill(t.learn.readMore, { what: p.name })} onPress={() => onWiki(p.name)} />
    </Page>
  );
}

function SkillsPage({ onClose, onOpenSkill }) {
  const { color } = useTheme();
  return (
    <Page title={t.learn.shelves.skills.title} sub={t.learn.shelves.skills.sub} onClose={onClose}>
      {STATS.map((st) => (
        <Frame key={st} cut={12} contentStyle={{ paddingHorizontal: 14, paddingTop: 12, paddingBottom: 4 }}>
          <Label tone={color.hi}>{t.stats[st].toUpperCase()}</Label>
          {GUILD[st].map((s, i) => <Row key={s.id} first={i === 0} title={s.name} sub={s.quest} onPress={() => onOpenSkill?.(s.id)} />)}
        </Frame>
      ))}
    </Page>
  );
}

export default function Learn({ user, player, onOpenSkill, onGoToQuest }) {
  const { color, font } = useTheme();
  const insets = useSafeAreaInsets();
  const [q, setQ] = useState("");
  const [wiki, setWiki] = useState(null); // { q, loading, results, error }
  const [page, setPage] = useState(null); // { kind, id }
  const [quote, setQuote] = useState(null);
  const favs = player.favQuotes ?? [];
  const star = (id) => toggleFavQuote(user.uid, id, !favs.includes(id)).catch(() => {});
  const openWiki = (title) => setPage({ kind: "wiki", id: title });
  const openSkill = (id) => { setPage(null); onOpenSkill?.(id); };

  // Local results while you type: quotes, philosophy, languages, skills and System words.
  const needle = q.trim().toLowerCase();
  const local = needle.length < 2 ? [] : [
    ...LANGUAGES.filter((l) => has(l.name, needle)).map((l) => ({ key: `l${l.id}`, title: l.name, sub: t.learn.kinds.language, go: () => setPage({ kind: "lang", id: l.id }) })),
    ...PHILOSOPHY.filter((p) => has(p.name, needle) || has(p.who, needle)).map((p) => ({ key: `p${p.id}`, title: p.name, sub: t.learn.kinds.philosophy, go: () => setPage({ kind: "philo", id: p.id }) })),
    ...Object.values(skillById).filter((s) => has(s.name, needle)).map((s) => ({ key: `s${s.id}`, title: s.name, sub: t.learn.kinds.skill, go: () => openSkill(s.id) })),
    ...TERMS.filter((k) => has(t.explain.terms[k].title, needle)).map((k) => ({ key: `t${k}`, title: t.explain.terms[k].title, sub: t.learn.kinds.word, go: () => setPage({ kind: "words" }) })),
    ...QUOTES.filter((x) => has(x.text, needle) || has(x.who, needle)).slice(0, 6).map((x) => ({ key: `q${x.id}`, title: `“${x.text}”`, sub: x.who ?? t.learn.kinds.quote, go: () => setQuote(x) })),
  ].slice(0, 12);

  function search() {
    const query = q.trim();
    if (!query) return;
    setWiki({ q: query, loading: true });
    wikiSearch(query).then((results) => setWiki({ q: query, results })).catch(() => setWiki({ q: query, error: true }));
  }

  const shelves = [
    { id: "quotes", go: () => setPage({ kind: "quotes" }), n: QUOTES.length },
    { id: "philosophy", go: () => setPage({ kind: "philoList" }), n: PHILOSOPHY.length },
    { id: "languages", go: () => setPage({ kind: "langList" }), n: LANGUAGES.length },
    { id: "skills", go: () => setPage({ kind: "skills" }), n: Object.keys(skillById).length },
    { id: "words", go: () => setPage({ kind: "words" }), n: TERMS.length },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: color.bg }}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingTop: insets.top + 14, paddingBottom: 40, paddingHorizontal: 14, maxWidth: 520, width: "100%", alignSelf: "center", gap: 12 }}>
        <Glow height={380} at={0.2} />
        <View style={{ alignItems: "center", gap: 4, marginTop: 10, marginBottom: 6 }}>
          <Text accessibilityRole="header" style={{ fontFamily: font.bold, fontSize: 26, letterSpacing: 1, color: "#FFFFFF" }}>{t.learn.title}</Text>
          <Text style={{ fontFamily: font.body, fontSize: 14, color: color.muted, textAlign: "center" }}>{t.learn.sub}</Text>
        </View>

        <View style={{ flexDirection: "row", gap: 6 }}>
          <TextInput value={q} onChangeText={(v) => { setQ(v); if (!v.trim()) setWiki(null); }} onSubmitEditing={search} returnKeyType="search"
            placeholder={t.learn.searchPh} placeholderTextColor={color.muted} accessibilityLabel={t.learn.searchPh} autoCorrect={false}
            style={{ flex: 1, minHeight: 48, paddingHorizontal: 14, borderWidth: 1, borderColor: "rgba(159,203,255,0.35)", backgroundColor: "rgba(5,10,24,0.8)", color: "#FFFFFF", fontFamily: font.body, fontSize: 15 }} />
          <Pressable accessibilityRole="button" accessibilityLabel={t.learn.search} onPress={search} disabled={!q.trim()}
            style={({ pressed }) => ({ minHeight: 48, paddingHorizontal: 14, justifyContent: "center", borderWidth: 1, borderColor: color.frame, backgroundColor: pressed ? "rgba(159,203,255,0.2)" : "rgba(159,203,255,0.08)", opacity: q.trim() ? 1 : 0.5 })}>
            <Text style={{ fontFamily: font.bold, fontSize: 13, letterSpacing: 1, color: "#FFFFFF" }}>{t.learn.search.toUpperCase()}</Text>
          </Pressable>
        </View>

        {local.length ? (
          <Frame cut={12} contentStyle={{ paddingHorizontal: 14, paddingTop: 12, paddingBottom: 4 }}>
            <Label tone={color.hi}>{t.learn.inSystem}</Label>
            {local.map((r, i) => <Row key={r.key} first={i === 0} title={r.title} sub={r.sub} onPress={r.go} />)}
          </Frame>
        ) : null}

        {needle && !wiki ? (
          <Text style={{ fontFamily: font.body, fontSize: 13, color: color.muted }}>{fill(t.learn.pressSearch, { q: q.trim() })}</Text>
        ) : null}

        {wiki ? (
          <Frame cut={12} contentStyle={{ paddingHorizontal: 14, paddingTop: 12, paddingBottom: 8 }}>
            <Label tone={color.hi}>{t.learn.fromWikiTitle}</Label>
            {wiki.loading ? <ActivityIndicator color={color.accent} style={{ marginVertical: 14 }} /> : null}
            {wiki.error ? <Text style={{ fontFamily: font.body, fontSize: 13, color: color.muted, paddingVertical: 8 }}>{t.learn.searchFailed}</Text> : null}
            {wiki.results && !wiki.results.length ? <Text style={{ fontFamily: font.body, fontSize: 13, color: color.muted, paddingVertical: 8 }}>{t.learn.noResults}</Text> : null}
            {(wiki.results ?? []).map((r, i) => <Row key={r.title} first={i === 0} title={r.title} sub={r.snippet} onPress={() => openWiki(r.title)} />)}
            <LinkButton label={fill(t.learn.searchWebFor, { q: wiki.q })} onPress={() => Linking.openURL(webSearchUrl(wiki.q))} />
          </Frame>
        ) : null}

        {!needle ? shelves.map((s) => (
          <Pressable key={s.id} accessibilityRole="button" onPress={s.go} style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1 })}>
            <Frame cut={14} contentStyle={{ padding: 16, gap: 4 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" }}>
                <Text style={{ fontFamily: font.bold, fontSize: 18, color: "#FFFFFF" }}>{t.learn.shelves[s.id].title}</Text>
                <Text style={{ fontFamily: font.num, fontSize: 14, color: color.muted }}>{s.n}</Text>
              </View>
              <Text style={{ fontFamily: font.body, fontSize: 13, lineHeight: 18, color: color.muted }}>{t.learn.shelves[s.id].sub}</Text>
            </Frame>
          </Pressable>
        )) : null}
      </ScrollView>

      {page?.kind === "quotes" ? <QuoteLibrary mine={player.profile?.schools ?? []} favs={favs} onStar={star} onClose={() => setPage(null)} /> : null}
      {page?.kind === "philoList" ? (
        <Page title={t.learn.shelves.philosophy.title} sub={t.learn.shelves.philosophy.sub} onClose={() => setPage(null)}>
          <Frame cut={12} contentStyle={{ paddingHorizontal: 14, paddingVertical: 4 }}>
            {PHILOSOPHY.map((p, i) => <Row key={p.id} first={i === 0} title={SCHOOL_NAMES[p.id] ?? p.name} sub={fill(t.learn.readings, { who: p.who, n: player.philosophy?.[p.id] ?? 0, of: p.readings.length })} onPress={() => setPage({ kind: "philo", id: p.id, back: "philoList" })} />)}
          </Frame>
        </Page>
      ) : null}
      {page?.kind === "langList" ? (
        <Page title={t.learn.shelves.languages.title} sub={t.learn.shelves.languages.sub} onClose={() => setPage(null)}>
          <Frame cut={12} contentStyle={{ paddingHorizontal: 14, paddingVertical: 4 }}>
            {LANGUAGES.map((l, i) => <Row key={l.id} first={i === 0} title={l.name} sub={l.intro} onPress={() => setPage({ kind: "lang", id: l.id, back: "langList" })} />)}
          </Frame>
        </Page>
      ) : null}
      {page?.kind === "lang" ? <LanguagePage id={page.id} onClose={() => setPage(page.back ? { kind: page.back } : null)} onWiki={openWiki} onOpenSkill={openSkill} /> : null}
      {page?.kind === "philo" ? <PhilosophyPage id={page.id} user={user} player={player} onClose={() => setPage(page.back ? { kind: page.back } : null)} onWiki={openWiki}
        onGoToQuest={(f) => { setPage(null); onGoToQuest?.(f); }} /> : null}
      {page?.kind === "skills" ? <SkillsPage onClose={() => setPage(null)} onOpenSkill={openSkill} /> : null}
      {page?.kind === "words" ? <Page title={t.learn.shelves.words.title} sub={t.learn.shelves.words.sub} onClose={() => setPage(null)}><Glossary /></Page> : null}
      {page?.kind === "wiki" ? <Article title={page.id} onClose={() => setPage(null)} /> : null}
      {quote ? <QuotePage quote={quote} starred={favs.includes(quote.id)} onStar={() => star(quote.id)} onClose={() => setQuote(null)} /> : null}
    </View>
  );
}
