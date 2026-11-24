// After a quest: proof (a photo, when Settings asks for it on this kind of quest) and, after the
// important quests (main, trials, urgent), how it went and whether you cheated.
import { useState } from "react";
import { Image, Modal, Pressable, Text, View } from "react-native";
import { CHEAT, HOW, checkIn } from "../lib/honesty";
import { pickProof, saveProof } from "../lib/proof";
import { Frame, Label, SysButton } from "./sys";
import { useTheme } from "../theme";
import { t } from "../i18n";

function Chips({ options, labels, value, onChange, warn }) {
  const { color, font } = useTheme();
  return (
    <View style={{ flexDirection: "row", gap: 6 }}>
      {options.map((o) => {
        const on = value === o;
        const red = warn && on && o !== "no";
        return (
          <Pressable key={o} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => onChange(o)}
            style={{ flex: 1, minHeight: 46, alignItems: "center", justifyContent: "center", borderWidth: 1,
              borderColor: on ? (red ? "#F6B45A" : color.frame) : "rgba(159,203,255,0.22)", backgroundColor: on ? (red ? "rgba(246,180,90,0.12)" : "rgba(159,203,255,0.16)") : "transparent" }}>
            <Text style={{ fontFamily: font.bold, fontSize: 14, color: on ? "#FFFFFF" : color.muted }}>{labels[o]}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

// Proof: take a photo or pick one (a Strava screenshot). Shows a small preview once picked.
function ProofPick({ value, onPick, error }) {
  const { color, font } = useTheme();
  const btn = (source, label) => (
    <Pressable key={source} accessibilityRole="button" onPress={() => onPick(source)}
      style={{ flex: 1, minHeight: 46, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(159,203,255,0.3)" }}>
      <Text style={{ fontFamily: font.bold, fontSize: 13, color: color.text }}>{label}</Text>
    </Pressable>
  );
  return (
    <View style={{ gap: 8 }}>
      <Text style={{ fontFamily: font.bodyBold, fontSize: 14, color: color.text }}>{t.checkIn.proof}</Text>
      {value ? (
        <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
          <Image source={{ uri: value }} accessibilityLabel={t.checkIn.proofAdded} style={{ width: 64, height: 64, borderWidth: 1, borderColor: color.frame }} resizeMode="cover" />
          <Text style={{ flex: 1, fontFamily: font.bodyMedium, fontSize: 13, color: color.text }}>{t.checkIn.proofAdded}</Text>
          <Pressable accessibilityRole="button" onPress={() => onPick(null)} style={{ minHeight: 40, justifyContent: "center" }}>
            <Text style={{ fontFamily: font.bodyBold, fontSize: 13, color: color.accent }}>{t.checkIn.proofChange}</Text>
          </Pressable>
        </View>
      ) : (
        <View style={{ flexDirection: "row", gap: 6 }}>
          {btn("camera", t.checkIn.camera)}
          {btn("library", t.checkIn.library)}
        </View>
      )}
      <Text style={{ fontFamily: font.body, fontSize: 12, color: error ? "#F6B45A" : color.muted }}>{error ?? t.checkIn.proofNote}</Text>
    </View>
  );
}

// data: { logId, title, proof (ask for a photo), ask (how it went, did you cheat) } or null
export default function CheckIn({ uid, data, onClose }) {
  const { color, font } = useTheme();
  const [how, setHow] = useState(null);
  const [cheat, setCheat] = useState(null);
  const [photo, setPhoto] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  if (!data) return null;
  const ask = data.ask !== false;
  const close = () => { setHow(null); setCheat(null); setPhoto(null); setError(null); onClose(); };

  async function pick(source) {
    setError(null);
    if (!source) { setPhoto(null); return; }
    try {
      const r = await pickProof(source);
      if (r?.denied) setError(t.checkIn.cameraDenied);
      else if (r?.uri) setPhoto(r.uri);
    } catch { setError(t.checkIn.proofFailed); }
  }
  async function save() {
    setBusy(true);
    try {
      if (data.proof) await saveProof(uid, data.logId, photo);
      if (ask && (how || cheat)) checkIn(uid, data.logId, { how, cheat }).catch(() => {});
      close();
    } catch { setError(t.checkIn.proofFailed); } finally { setBusy(false); }
  }
  // Skipping a proof quest marks it "no proof"; it still counts.
  function skip() {
    if (data.proof) saveProof(uid, data.logId, null).catch(() => {});
    close();
  }
  return (
    <Modal transparent animationType="fade" visible onRequestClose={skip}>
      <View style={{ flex: 1, backgroundColor: "rgba(1,4,10,0.9)", justifyContent: "center", padding: 18 }}>
        <Frame kind="premium" cut={16} style={{ width: "100%", maxWidth: 420, alignSelf: "center" }} contentStyle={{ padding: 18, gap: 14 }}>
          <View style={{ gap: 4 }}>
            <Label tone={color.hi}>{data.proof && !ask ? t.checkIn.proofTitle : t.checkIn.title}</Label>
            <Text style={{ fontFamily: font.bold, fontSize: 18, lineHeight: 24, color: "#FFFFFF" }}>{data.title}</Text>
          </View>
          {data.proof ? <ProofPick value={photo} onPick={pick} error={error} /> : null}
          {ask ? (
            <>
              <View style={{ gap: 8 }}>
                <Text style={{ fontFamily: font.bodyBold, fontSize: 14, color: color.text }}>{t.checkIn.how}</Text>
                <Chips options={HOW} labels={t.checkIn.hows} value={how} onChange={setHow} />
              </View>
              <View style={{ gap: 8 }}>
                <Text style={{ fontFamily: font.bodyBold, fontSize: 14, color: color.text }}>{t.checkIn.cheat}</Text>
                <Chips options={CHEAT} labels={t.checkIn.cheats} value={cheat} onChange={setCheat} warn />
                <Text style={{ fontFamily: font.body, fontSize: 12, color: color.muted }}>{t.checkIn.note}</Text>
              </View>
            </>
          ) : null}
          <SysButton label={t.checkIn.save} onPress={save} disabled={busy || (!how && !cheat && !photo)} />
          <Pressable accessibilityRole="button" onPress={skip} style={{ minHeight: 40, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontFamily: font.bodyBold, fontSize: 14, color: color.muted }}>{data.proof && !photo ? t.checkIn.skipProof : t.checkIn.skip}</Text>
          </Pressable>
        </Frame>
      </View>
    </Modal>
  );
}
