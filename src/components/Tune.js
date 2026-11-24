// Tune the System: the questionnaire, in parts. Optional, any order, each part saved on its own.
// Every question changes something (see game/profile.js); a question that changes nothing isn't asked.
import { useEffect, useRef, useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { patchProfile } from "../lib/player";
import { DUTIES, INTERESTS, MOUNTAINS, MOUNTAIN_LEVELS, PARTS, dayTimes, partsDone } from "../game/profile";
import { SCHOOL_NAMES } from "../game/quotes";
import { useTrack } from "./saved";
import { HelpDot } from "./Explain";
import { useTheme } from "../theme";
import { t } from "../i18n";

const fill = (s, vars) => Object.entries(vars).reduce((acc, [k, v]) => acc.split(`{${k}}`).join(String(v)), s);
const hhmm = (h) => { const m = Math.round(h * 60); return `${String(Math.floor(m / 60) % 24).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`; };
const toggle = (list, id) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);

function Chip({ label, sub, on, onPress, flex }) {
  const { color, font } = useTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected: on }} onPress={onPress}
      style={{ flex: flex ? 1 : undefined, minHeight: 44, paddingHorizontal: 12, paddingVertical: 6, justifyContent: "center", alignItems: flex ? "center" : "flex-start", borderWidth: 1, borderColor: on ? color.frame : "rgba(159,203,255,0.22)", backgroundColor: on ? "rgba(159,203,255,0.16)" : "transparent" }}>
      <Text style={{ fontFamily: font.bold, fontSize: 13, color: on ? "#FFFFFF" : color.muted }}>{label}</Text>
      {sub ? <Text style={{ fontFamily: font.body, fontSize: 11, color: color.muted }}>{sub}</Text> : null}
    </Pressable>
  );
}

function Stepper({ label, value, onChange, min, max }) {
  const { color, font } = useTheme();
  const btn = (d, sign) => (
    <Pressable accessibilityRole="button" accessibilityLabel={`${label} ${sign}15`} onPress={() => onChange(Math.min(max, Math.max(min, value + d)))}
      style={{ width: 48, height: 48, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(159,203,255,0.3)" }}>
      <Text style={{ fontFamily: font.bold, fontSize: 20, color: color.text }}>{sign}</Text>
    </Pressable>
  );
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
      <Text style={{ flex: 1, fontFamily: font.bodyMedium, fontSize: 14, color: color.text }}>{label}</Text>
      {btn(-0.25, "−")}
      <Text accessibilityLabel={`${label} ${hhmm(value)}`} style={{ width: 66, textAlign: "center", fontFamily: font.num, fontSize: 22, color: "#FFFFFF" }}>{hhmm(value)}</Text>
      {btn(0.25, "+")}
    </View>
  );
}

function NumberInput({ label, value, onChangeText, keyboardType, width }) {
  const { color, font } = useTheme();
  return (
    <View style={{ gap: 6, width, flex: width ? undefined : 1 }}>
      <Text style={{ fontFamily: font.bodyBold, fontSize: 12, color: color.muted }}>{label}</Text>
      <TextInput value={value} onChangeText={onChangeText} keyboardType={keyboardType} accessibilityLabel={label}
        style={{ minHeight: 46, paddingHorizontal: 12, fontFamily: font.bodyMedium, fontSize: 16, color: "#FFFFFF", borderWidth: 1, borderColor: "rgba(159,203,255,0.3)", backgroundColor: "rgba(5,10,24,0.7)" }} />
    </View>
  );
}

// One part's questions. draft holds the answers until you save.
function PartForm({ part, draft, set }) {
  const { color, font } = useTheme();
  const row = { flexDirection: "row", flexWrap: "wrap", gap: 6 };
  if (part === "day") {
    const { wake, bed } = dayTimes(draft);
    return (
      <View style={{ gap: 10 }}>
        <Stepper label={t.tune.wake} value={wake} min={4} max={12} onChange={(v) => set({ wake: hhmm(v) })} />
        <Stepper label={t.tune.bed} value={bed} min={19} max={26} onChange={(v) => set({ bed: hhmm(v) })} />
      </View>
    );
  }
  if (part === "interests") {
    const list = draft.interests ?? [];
    return <View style={row}>{INTERESTS.map((i) => <Chip key={i.id} label={i.name} on={list.includes(i.id)} onPress={() => set({ interests: toggle(list, i.id) })} />)}</View>;
  }
  if (part === "mountains") {
    const m = draft.mountains ?? {};
    return (
      <View style={{ gap: 12 }}>
        {MOUNTAINS.map((x) => (
          <View key={x.id} style={{ gap: 6 }}>
            <Text style={{ fontFamily: font.bodyMedium, fontSize: 14, color: color.text }}>{x.name}</Text>
            <View style={{ flexDirection: "row", gap: 6 }}>
              {MOUNTAIN_LEVELS.map((lv) => (
                <Chip key={lv} flex label={t.tune.levels[lv]} on={m[x.id] === lv}
                  onPress={() => {
                    // At most two "very hard": a mountain is the one that stands out, not all of them.
                    if (lv === 4 && m[x.id] !== 4 && Object.values(m).filter((v) => v === 4).length >= 2) return;
                    const next = { ...m }; if (m[x.id] === lv) delete next[x.id]; else next[x.id] = lv; set({ mountains: next });
                  }} />
              ))}
            </View>
          </View>
        ))}
      </View>
    );
  }
  if (part === "duties") {
    const list = draft.duties ?? [];
    return (
      <View style={row}>
        {DUTIES.map((d) => <Chip key={d.id} label={d.name} sub={`${d.minutes} min · ${t.tune.freq[d.freq]}`} on={list.includes(d.id)} onPress={() => set({ duties: toggle(list, d.id) })} />)}
      </View>
    );
  }
  if (part === "mind") {
    const list = draft.schools ?? [];
    return <View style={row}>{Object.entries(SCHOOL_NAMES).map(([id, name]) => <Chip key={id} label={name} on={list.includes(id)} onPress={() => set({ schools: toggle(list, id) })} />)}</View>;
  }
  // about
  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: "row", gap: 8 }}>
        <NumberInput label={t.settings.age} value={draft.ageText ?? ""} onChangeText={(v) => set({ ageText: v })} keyboardType="number-pad" width={90} />
        <NumberInput label={t.settings.weight} value={draft.weightText ?? ""} onChangeText={(v) => set({ weightText: v })} keyboardType="decimal-pad" />
      </View>
      <View style={{ gap: 6 }}>
        <Text style={{ fontFamily: font.bodyBold, fontSize: 12, color: color.muted }}>{t.settings.sex}</Text>
        <View style={{ flexDirection: "row", gap: 6 }}>
          {["male", "female", "other"].map((s) => <Chip key={s} flex label={t.settings.sexes[s]} on={draft.sex === s} onPress={() => set({ sex: draft.sex === s ? null : s })} />)}
        </View>
      </View>
    </View>
  );
}

// What a part saves (only its own fields).
function patchFor(part, d) {
  const num = (v) => { const n = Number(String(v ?? "").replace(",", ".")); return String(v ?? "").trim() && Number.isFinite(n) && n > 0 ? n : null; };
  if (part === "day") { const { wake, bed } = dayTimes(d); return { wake: hhmm(wake), bed: hhmm(bed) }; }
  if (part === "interests") return { interests: d.interests ?? [] };
  if (part === "mountains") return { mountains: d.mountains ?? {} };
  if (part === "duties") return { duties: d.duties ?? [] };
  if (part === "mind") return { schools: d.schools ?? [] };
  return { age: num(d.ageText), weight: num(d.weightText), sex: d.sex ?? null };
}

const startDraft = (p = {}) => ({ ...p, ageText: p.age ? String(p.age) : "", weightText: p.weight ? String(p.weight) : "" });

export default function Tune({ user, player }) {
  const { color, font } = useTheme();
  const track = useTrack();
  const [open, setOpen] = useState(null);
  const [draft, setDraft] = useState(() => startDraft(player.profile));
  const done = partsDone(player.profile);
  const count = PARTS.filter((p) => done[p]).length;

  // Every answer saves itself a moment after you change it (or right away when you close the part).
  const pending = useRef(null);
  const timer = useRef(null);
  const flushRef = useRef(null);
  flushRef.current = () => {
    clearTimeout(timer.current);
    if (!pending.current) return;
    const { part, d } = pending.current;
    pending.current = null;
    track(patchProfile(user.uid, patchFor(part, d))).catch(() => {});
  };
  useEffect(() => () => flushRef.current(), []);
  function change(part, patch) {
    const next = { ...draft, ...patch };
    setDraft(next);
    pending.current = { part, d: next };
    clearTimeout(timer.current);
    timer.current = setTimeout(() => flushRef.current(), 700);
  }

  return (
    <View>
      <Text style={{ fontFamily: font.bodyMedium, fontSize: 13, color: color.muted }}>{fill(t.tune.progress, { n: count, of: PARTS.length })}</Text>
      {PARTS.map((part) => {
        const isOpen = open === part;
        return (
          <View key={part} style={{ borderTopWidth: 1, borderTopColor: color.line, marginTop: 10 }}>
            <Pressable accessibilityRole="button" accessibilityState={{ expanded: isOpen }}
              onPress={() => { flushRef.current(); setOpen(isOpen ? null : part); setDraft(startDraft(player.profile)); }}
              style={{ minHeight: 56, flexDirection: "row", alignItems: "center", gap: 12, paddingTop: 10 }}>
              <View style={{ width: 9, height: 9, transform: [{ rotate: "45deg" }], borderWidth: 1, borderColor: done[part] ? color.accent : color.muted, backgroundColor: done[part] ? color.accent : "transparent" }} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={{ fontFamily: font.bold, fontSize: 15, color: "#FFFFFF" }}>{t.tune.parts[part].title}</Text>
                <Text style={{ fontFamily: font.body, fontSize: 12, lineHeight: 17, color: color.muted }}>{t.tune.parts[part].effect}</Text>
              </View>
              <Text style={{ fontFamily: font.bold, fontSize: 18, color: color.muted }}>{isOpen ? "−" : "+"}</Text>
            </Pressable>
            {isOpen ? (
              <View style={{ gap: 12, paddingTop: 8, paddingBottom: 10 }}>
                <View style={{ flexDirection: "row", gap: 10, alignItems: "flex-start" }}>
                  <Text style={{ flex: 1, fontFamily: font.body, fontSize: 13, lineHeight: 18, color: color.text }}>{t.tune.parts[part].ask}</Text>
                  {part === "mountains" || part === "duties" ? <HelpDot term={part} size={20} /> : null}
                </View>
                <PartForm part={part} draft={draft} set={(patch) => change(part, patch)} />
                <Text style={{ fontFamily: font.body, fontSize: 12, color: color.muted }}>{t.tune.autosave}</Text>
              </View>
            ) : null}
          </View>
        );
      })}
      <Text style={{ marginTop: 14, fontFamily: font.body, fontSize: 12, lineHeight: 17, color: color.muted }}>{t.tune.note}</Text>
    </View>
  );
}
