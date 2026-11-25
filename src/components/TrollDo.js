// Doing a troll quest: what it is (sized to you), and for hard ones the proof: a photo, and for place ones
// a location check that you're really there. The sender sees the photo and the place.
import { useState } from "react";
import { Image, Modal, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { trollById, trollNeedsProof, trollTitleFor, trollXp } from "../game/social";
import { completeTroll } from "../lib/social";
import { checkPlace } from "../lib/location";
import { pickProof } from "../lib/proof";
import { doneFeel } from "../lib/haptics";
import { Frame, Label, SysButton } from "./sys";
import { useTheme } from "../theme";
import { t } from "../i18n";

const fill = (s, vars) => Object.entries(vars).reduce((acc, [k, v]) => acc.split(`{${k}}`).join(String(v)), s);

export default function TrollDo({ user, player, troll, onClose, onDone }) {
  const { color, font } = useTheme();
  const insets = useSafeAreaInsets();
  const x = trollById[troll.troll];
  const [photo, setPhoto] = useState(null);
  const [place, setPlace] = useState(null); // { ok, name } | { error }
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  if (!x) return null;
  const needPhoto = trollNeedsProof(x);
  // The map doesn't know every gym or pool: after a check that didn't find it, you can finish with the photo only.
  // The sender then sees "location not checked".
  const [skipPlace, setSkipPlace] = useState(false);
  const ready = (!needPhoto || photo) && (!x.place || place?.ok || skipPlace);

  async function take(source) {
    setMsg(null);
    try {
      const r = await pickProof(source);
      if (r?.denied) setMsg(t.troll.cameraDenied);
      else if (r?.uri) setPhoto(r.uri);
    } catch {
      setMsg(t.troll.doFailed);
    }
  }
  async function check() {
    setBusy(true);
    setMsg(null);
    const r = await checkPlace(x.place);
    setPlace(r);
    setBusy(false);
  }
  async function done() {
    setBusy(true);
    setMsg(null);
    try {
      const r = await completeTroll(user.uid, troll, player, needPhoto ? { photo, place: x.place ? { kind: x.place, ...place, skipped: !place?.ok && skipPlace } : null } : null);
      doneFeel();
      onDone?.(r);
      onClose();
    } catch {
      setMsg(t.troll.doFailed);
    } finally {
      setBusy(false);
    }
  }

  const placeText = !place ? null
    : place.ok ? fill(t.troll.placeOk, { place: place.name ?? t.troll.places[x.place] })
      : place.error === "unavailable" ? t.troll.placeUnavailable
        : place.error === "no-permission" ? t.troll.placeNoPermission
          : place.error ? t.troll.placeFailed
            : fill(t.troll.placeNo, { place: t.troll.places[x.place] });

  return (
    <Modal transparent animationType="slide" visible onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "rgba(1,4,10,0.7)", justifyContent: "flex-end" }}>
        <View style={{ maxHeight: "90%", backgroundColor: color.bg, borderTopWidth: 1, borderTopColor: "#F6B45A" }}>
          <ScrollView contentContainerStyle={{ padding: 18, paddingBottom: insets.bottom + 18, gap: 14, maxWidth: 520, width: "100%", alignSelf: "center" }}>
            <Label tone="#F6B45A">{fill(t.troll.fromKicker, { name: troll.fromName, level: t.troll.levels[x.level].toUpperCase() })}</Label>
            <Text accessibilityRole="header" style={{ fontFamily: font.bold, fontSize: 22, lineHeight: 28, color: "#FFFFFF" }}>{trollTitleFor(x, player)}</Text>
            {x.scale ? <Text style={{ fontFamily: font.body, fontSize: 13, lineHeight: 18, color: color.muted }}>{t.troll.sized}</Text> : null}
            <Text style={{ fontFamily: font.body, fontSize: 13, color: color.muted }}>{fill(t.troll.reward, { xp: trollXp(x) })}</Text>

            {needPhoto ? (
              <Frame cut={12} contentStyle={{ padding: 14, gap: 10 }}>
                <Label tone={color.hi}>{t.troll.proofTitle}</Label>
                <Text style={{ fontFamily: font.body, fontSize: 14, lineHeight: 20, color: color.text }}>{x.proof}</Text>
                {x.place ? (
                  <View style={{ gap: 6 }}>
                    <SysButton label={place?.ok ? t.troll.placeChecked : fill(t.troll.checkPlace, { place: t.troll.places[x.place].toUpperCase() })} onPress={check} disabled={busy || place?.ok} />
                    {placeText ? <Text style={{ fontFamily: font.bodyMedium, fontSize: 13, lineHeight: 18, color: place?.ok ? color.accent : "#F6B45A" }}>{placeText}</Text> : null}
                    {place && !place.ok ? (
                      <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: skipPlace }} onPress={() => setSkipPlace((v) => !v)} style={{ minHeight: 40, justifyContent: "center" }}>
                        <Text style={{ fontFamily: font.bodyBold, fontSize: 13, lineHeight: 18, color: skipPlace ? color.accent : color.muted }}>{`${skipPlace ? "✓ " : ""}${fill(t.troll.skipPlace, { name: troll.fromName })}`}</Text>
                      </Pressable>
                    ) : null}
                  </View>
                ) : null}
                {photo ? <Image source={{ uri: photo }} accessibilityLabel={t.troll.gotPhoto} style={{ width: "100%", height: 200, resizeMode: "cover" }} /> : null}
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <SysButton label={photo ? t.troll.retake : t.troll.camera} onPress={() => take("camera")} style={{ flex: 1 }} />
                  <SysButton label={t.troll.library} onPress={() => take("library")} style={{ flex: 1 }} />
                </View>
                <Text style={{ fontFamily: font.body, fontSize: 12, lineHeight: 17, color: color.muted }}>{fill(t.troll.whoSees, { name: troll.fromName })}</Text>
              </Frame>
            ) : null}

            {msg ? <Text style={{ fontFamily: font.bodyMedium, fontSize: 13, color: "#F6B45A" }}>{msg}</Text> : null}
            <SysButton label={t.troll.complete} onPress={done} disabled={busy || !ready} />
            {!ready ? <Text style={{ fontFamily: font.body, fontSize: 12, color: color.muted, textAlign: "center" }}>{x.place ? t.troll.needBoth : t.troll.needPhoto}</Text> : null}
            <Pressable accessibilityRole="button" onPress={onClose} style={{ minHeight: 44, alignItems: "center", justifyContent: "center" }}>
              <Text style={{ fontFamily: font.bodyBold, fontSize: 14, color: color.muted }}>{t.troll.later}</Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
