// The shop: buy app time with coins (longer is cheaper per minute). Locked while a troll quest is open.
import { useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { APP_KINDS, CAPPED, EFFECT_IDS, EFFECT_PRICE, LENGTHS, MAX_SHIELDS, NAME_EFFECTS, SHIELD_PRICE, RARITIES, SKINS, SKIN_IDS, SKIN_PRICES, skinPrice, activeAppTime, lateExtra, priceFor, rateAt, refundFor, usedToday } from "../game/shop";
import { todayKey } from "../game/quests";
import { trollQueue } from "../game/social";
import { buyAppTime, buyEffect, buyShield, buySkin, endAppTime } from "../lib/shop";
import { sendTroll, useFriends, useTrolls } from "../lib/social";
import { TrollPicker } from "./Friends";
import NameText from "./NameText";
import Unlock from "./Unlock";
import { doneFeel } from "../lib/haptics";
import { Coins, Frame, Glow, Label, SysButton } from "./sys";
import { SkinProvider, useTheme } from "../theme";
import { t } from "../i18n";
import SwipeBack from "./SwipeBack";

const fill = (s, vars) => Object.entries(vars ?? {}).reduce((acc, [k, v]) => acc.split(`{${k}}`).join(String(v)), String(s ?? ""));
export const leftText = (ms) => {
  const m = Math.max(0, Math.ceil(ms / 60000));
  return m >= 60 ? `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, "0")}m` : `${m} min`;
};

const RARITY_TONE = { common: "#93A6C8", rare: "#6FC8FF", legendary: "#F0C45C" };

// A small live sample of a theme: its background, backdrop, a frame in its shape and a button.
function ThemeSample({ id, height = 96, big = false }) {
  const skin = id === "system" ? null : SKINS[id];
  return (
    <SkinProvider id={`pv-${id}`} skin={skin}>
      <SampleBody height={height} big={big} />
    </SkinProvider>
  );
}
function SampleBody({ height, big }) {
  const { color, font } = useTheme();
  return (
    <View style={{ height, overflow: "hidden", backgroundColor: color.bg, padding: big ? 14 : 8, justifyContent: "flex-end", gap: big ? 10 : 6 }}>
      <Glow height={height} at={0.3} />
      <Frame cut={big ? 12 : 8} kind={big ? "premium" : "plain"} contentStyle={{ paddingHorizontal: big ? 12 : 8, paddingVertical: big ? 10 : 6, gap: big ? 6 : 4 }}>
        {big ? <Text style={{ fontFamily: font.bold, fontSize: 10, letterSpacing: 2, color: color.hi }}>{t.shop.sampleQuest}</Text> : null}
        <View style={{ height: big ? 5 : 3, width: "70%", backgroundColor: color.accent }} />
        <View style={{ height: big ? 5 : 3, width: "40%", backgroundColor: color.purple, opacity: 0.8 }} />
      </Frame>
      {big ? <SysButton label={t.shop.sampleButton} onPress={() => {}} style={{ minHeight: 40 }} /> : null}
    </View>
  );
}

// Themes, by rarity. Tap one to see it bigger; buy or wear it from there.
function Themes({ player, coins, busy, onPick }) {
  const { color, font } = useTheme();
  const [sel, setSel] = useState(null);
  const current = player.skin ?? "system";
  const ownedOf = (id) => id === "system" || (player.skins ?? []).includes(id);
  return (
    <Frame cut={12} contentStyle={{ padding: 16, gap: 12 }}>
      <Label tone={color.hi}>{t.shop.skinsTitle}</Label>
      <Text style={{ fontFamily: font.body, fontSize: 13, lineHeight: 18, color: color.muted }}>{t.shop.skinsSub}</Text>
      {RARITIES.map((rar) => {
        const ids = SKIN_IDS.filter((id) => SKINS[id].rarity === rar);
        return (
          <View key={rar} style={{ gap: 8 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Text style={{ fontFamily: font.bold, fontSize: 11, letterSpacing: 2, color: RARITY_TONE[rar] }}>{t.shop.rarity[rar]}</Text>
              <View style={{ flex: 1, height: 1, backgroundColor: color.line }} />
              <Coins value={SKIN_PRICES[rar]} size={13} />
            </View>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {ids.map((id) => {
                const on = current === id;
                const owned = ownedOf(id);
                const wide = rar !== "common";
                return (
                  <Pressable key={id} accessibilityRole="button" accessibilityState={{ selected: sel === id }} onPress={() => setSel(sel === id ? null : id)}
                    style={{ width: wide ? "48%" : "31%", flexGrow: wide ? 1 : 0, gap: 6, padding: 4, borderWidth: 1,
                      borderColor: sel === id || on ? RARITY_TONE[rar] : "rgba(159,203,255,0.16)" }}>
                    <ThemeSample id={id} height={wide ? 92 : 64} />
                    <View style={{ paddingHorizontal: 4, paddingBottom: 2 }}>
                      <Text numberOfLines={1} style={{ fontFamily: font.bold, fontSize: 12, color: "#FFFFFF" }}>{SKINS[id].name}</Text>
                      <Text style={{ fontFamily: font.body, fontSize: 11, color: on ? color.accent : color.muted }}>{on ? t.shop.wearing : owned ? t.shop.owned : fill(t.shop.price, { n: skinPrice(id) })}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
            {sel && SKINS[sel].rarity === rar ? (
              <View style={{ gap: 10, padding: 10, borderWidth: 1, borderColor: RARITY_TONE[rar], backgroundColor: "rgba(255,255,255,0.03)" }}>
                <ThemeSample id={sel} height={170} big />
                <Text style={{ fontFamily: font.bold, fontSize: 15, color: "#FFFFFF" }}>{SKINS[sel].name}</Text>
                {SKINS[sel].blurb ? <Text style={{ fontFamily: font.body, fontSize: 13, lineHeight: 18, color: color.muted }}>{SKINS[sel].blurb}</Text> : null}
                <SysButton
                  label={current === sel ? t.shop.wearing : ownedOf(sel) ? t.shop.wear : fill(t.shop.buyFor, { n: skinPrice(sel) })}
                  disabled={busy || current === sel || (!ownedOf(sel) && coins < skinPrice(sel))}
                  onPress={() => onPick(sel, ownedOf(sel))} />
                {!ownedOf(sel) && coins < skinPrice(sel) ? (
                  <Text style={{ fontFamily: font.body, fontSize: 12, color: color.muted }}>{fill(t.shop.needMore, { n: skinPrice(sel) - coins })}</Text>
                ) : null}
              </View>
            ) : null}
          </View>
        );
      })}
    </Frame>
  );
}

export default function Shop({ user, player, onClose }) {
  const { color, font } = useTheme();
  const insets = useSafeAreaInsets();
  const [kind, setKind] = useState("social");
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const [trollFor, setTrollFor] = useState(null);
  const { friends } = useFriends(user.uid);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 15000); return () => clearInterval(id); }, []);
  const trollQ = trollQueue(useTrolls(user.uid));
  const locked = trollQ.active.length > 0;
  const coins = player.coins ?? 0;
  const active = activeAppTime(player, now);

  const used = usedToday(player, kind, todayKey());
  const extra = lateExtra(player, new Date(now));
  const rate = rateAt(kind, used);
  const refund = refundFor(active, now);

  // Buying app time goes through the seal: hold it until it breaks, then the purchase happens.
  const [unlock, setUnlock] = useState(null); // { minutes, cost }
  const buy = (minutes) => { setMsg(null); setUnlock({ minutes, cost: priceFor(kind, minutes, used, extra) }); };

  // Any other purchase: run it, then show what happened.
  async function run(fn, okText) {
    setBusy(true);
    setMsg(null);
    try { await fn(); doneFeel(); setMsg({ ok: true, text: okText }); }
    catch (e) { setMsg({ ok: false, text: e.message === "no-coins" ? t.shop.noCoins : e.message === "have-shield" ? t.shop.haveShield : t.shop.failed }); }
    finally { setBusy(false); }
  }
  async function pickTroll(id) {
    const f = trollFor;
    setTrollFor(null);
    await run(() => sendTroll(user.uid, player.name, f.uid, f.card?.name ?? f.name, id), fill(t.shop.trollSent, { name: f.card?.name ?? f.name }));
  }

  async function end() {
    try {
      const r = await endAppTime(user.uid, t.shop.refundTitle);
      setMsg({ ok: true, text: r.coins ? fill(t.shop.refunded, { n: r.coins }) : t.shop.ended });
    } catch { setMsg({ ok: false, text: t.shop.failed }); }
  }

  return (
    <Modal animationType="slide" visible onRequestClose={onClose}>
      <SwipeBack onBack={onClose}>
      <View style={{ flex: 1, backgroundColor: color.bg }}>
        <ScrollView contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 40, paddingHorizontal: 14, maxWidth: 520, width: "100%", alignSelf: "center", gap: 12 }}>
          <Glow height={380} at={0.18} />
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Pressable accessibilityRole="button" onPress={onClose} style={{ minHeight: 44, justifyContent: "center" }}>
              <Text style={{ fontFamily: font.bodyBold, fontSize: 14, color: color.accent }}>{`‹ ${t.shop.back}`}</Text>
            </Pressable>
            <Coins value={coins} size={22} />
          </View>
          <Text accessibilityRole="header" style={{ textAlign: "center", fontFamily: font.bold, fontSize: 26, color: "#FFFFFF" }}>{t.shop.title}</Text>
          {msg ? <Text accessibilityLiveRegion="polite" style={{ textAlign: "center", fontFamily: font.bodyBold, fontSize: 13, color: msg.ok ? color.accent : "#F6B45A" }}>{msg.text}</Text> : null}

          {active ? (
            <Frame kind="premium" cut={12} contentStyle={{ padding: 16, gap: 6 }}>
              <Label tone={color.hi}>{t.shop.active}</Label>
              <Text style={{ fontFamily: font.bold, fontSize: 20, color: "#FFFFFF" }}>{fill(t.shop.activeLine, { kind: active.kind === "mixed" ? t.shop.mixed : t.shop.kinds[active.kind], left: leftText(active.end - now) })}</Text>
              <Pressable accessibilityRole="button" onPress={end} style={{ minHeight: 40, justifyContent: "center", alignSelf: "flex-start" }}>
                <Text style={{ fontFamily: font.bodyBold, fontSize: 13, color: color.accent }}>{refund.coins ? fill(t.shop.endNow, { n: refund.coins }) : t.shop.endNowNone}</Text>
              </Pressable>
            </Frame>
          ) : null}

          {locked ? (
            <Frame cut={12} contentStyle={{ padding: 16, gap: 6 }} style={{ borderColor: "#F6B45A" }}>
              <Label tone="#F6B45A">{t.shop.locked}</Label>
              <Text style={{ fontFamily: font.body, fontSize: 14, lineHeight: 20, color: color.text }}>{t.shop.lockedText}</Text>
            </Frame>
          ) : (
            <Frame cut={12} contentStyle={{ padding: 16, gap: 12 }}>
              <View style={{ gap: 4 }}>
                <Label tone={color.hi}>{t.shop.appTitle}</Label>
                <Text style={{ fontFamily: font.body, fontSize: 13, lineHeight: 18, color: color.muted }}>{t.shop.appSub}</Text>
              </View>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                {APP_KINDS.map((k) => {
                  const on = kind === k;
                  return (
                    <Pressable key={k} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => setKind(k)}
                      style={{ minHeight: 44, paddingHorizontal: 12, justifyContent: "center", borderWidth: 1, borderColor: on ? color.frame : "rgba(159,203,255,0.22)", backgroundColor: on ? "rgba(159,203,255,0.16)" : "transparent" }}>
                      <Text style={{ fontFamily: font.bold, fontSize: 13, color: on ? "#FFFFFF" : color.muted }}>{t.shop.kinds[k]}</Text>
                    </Pressable>
                  );
                })}
              </View>
              {CAPPED.includes(kind) ? (
                <Text style={{ fontFamily: font.body, fontSize: 13, lineHeight: 18, color: rate > 1 ? "#F6B45A" : color.text }}>
                  {fill(t.shop.usedToday, { m: used, kind: t.shop.kinds[kind].toLowerCase() })} {rate === 1 ? fill(t.shop.rate1, { left: 60 - used }) : rate === 2 ? fill(t.shop.rate2, { left: 120 - used }) : t.shop.rate3}{extra ? ` ${fill(t.shop.late, { n: extra })}` : ""}
                </Text>
              ) : <Text style={{ fontFamily: font.body, fontSize: 13, color: color.text }}>{t.shop.otherFlat}</Text>}
              {LENGTHS.map((m) => {
                const cost = priceFor(kind, m, used, extra);
                const can = coins >= cost;
                return (
                  <View key={m} style={{ flexDirection: "row", alignItems: "center", gap: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: color.line }}>
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={{ fontFamily: font.bold, fontSize: 17, color: "#FFFFFF" }}>{leftText(m * 60000)}</Text>
                      {cost > m ? <Text style={{ fontFamily: font.body, fontSize: 12, color: "#F6B45A" }}>{fill(t.shop.pricier, { n: cost - m })}</Text> : null}
                    </View>
                    <Coins value={cost} size={16} />
                    <SysButton label={can ? t.shop.buy : fill(t.shop.needMore, { n: cost - coins })} disabled={!can || busy} onPress={() => buy(m)} style={{ minHeight: 44, minWidth: 96 }} />
                  </View>
                );
              })}
              <Text style={{ fontFamily: font.body, fontSize: 12, lineHeight: 17, color: color.muted }}>{t.shop.honest}</Text>
            </Frame>
          )}

          {!locked ? (
            <>
              <Frame cut={12} contentStyle={{ padding: 16, gap: 10 }}>
                <Label tone={color.hi}>{t.shop.trollTitle}</Label>
                <Text style={{ fontFamily: font.body, fontSize: 13, lineHeight: 18, color: color.muted }}>{t.shop.trollSub}</Text>
                {friends === null ? null : friends.length === 0 ? (
                  <Text style={{ fontFamily: font.body, fontSize: 13, color: color.muted }}>{t.shop.trollNoFriends}</Text>
                ) : (
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                    {friends.map((f) => (
                      <Pressable key={f.uid} accessibilityRole="button" onPress={() => setTrollFor(f)}
                        style={{ minHeight: 44, paddingHorizontal: 12, justifyContent: "center", borderWidth: 1, borderColor: "rgba(159,203,255,0.3)" }}>
                        <Text style={{ fontFamily: font.bold, fontSize: 13, color: "#FFFFFF" }}>{f.card?.name ?? f.name}</Text>
                      </Pressable>
                    ))}
                  </View>
                )}
              </Frame>

              <Frame cut={12} contentStyle={{ padding: 16, gap: 8 }}>
                <Label tone={color.hi}>{t.shop.shieldTitle}</Label>
                <Text style={{ fontFamily: font.body, fontSize: 13, lineHeight: 18, color: color.muted }}>{t.shop.shieldSub}</Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <Text style={{ flex: 1, fontFamily: font.bodyMedium, fontSize: 14, color: color.text }}>{fill(t.shop.shieldHave, { n: player.streakShields ?? 0, max: MAX_SHIELDS })}</Text>
                  <Coins value={SHIELD_PRICE} size={16} />
                  <SysButton label={(player.streakShields ?? 0) >= MAX_SHIELDS ? t.shop.have : t.shop.buy} disabled={busy || (player.streakShields ?? 0) >= MAX_SHIELDS || coins < SHIELD_PRICE}
                    onPress={() => run(() => buyShield(user.uid, t.shop.shieldTitleLog), t.shop.shieldBought)} style={{ minHeight: 44, minWidth: 96 }} />
                </View>
              </Frame>

              <Themes player={player} coins={coins} busy={busy}
                onPick={(id, owned) => run(() => buySkin(user.uid, id, fill(t.shop.skinLog, { name: SKINS[id].name })), owned ? t.shop.skinOn : fill(t.shop.skinBought, { name: SKINS[id].name }))} />

              <Frame cut={12} contentStyle={{ padding: 16, gap: 10 }}>
                <Label tone={color.hi}>{t.shop.effectsTitle}</Label>
                <Text style={{ fontFamily: font.body, fontSize: 13, lineHeight: 18, color: color.muted }}>{fill(t.shop.effectsSub, { n: EFFECT_PRICE })}</Text>
                {EFFECT_IDS.map((id) => {
                  const owned = id === "none" || (player.nameEffects ?? []).includes(id);
                  const on = (player.nameEffect ?? "none") === id;
                  return (
                    <Pressable key={id} accessibilityRole="button" accessibilityState={{ selected: on }} disabled={busy || on || (!owned && coins < EFFECT_PRICE)}
                      onPress={() => run(() => buyEffect(user.uid, id, fill(t.shop.effectLog, { name: NAME_EFFECTS[id].name })), owned ? t.shop.effectOn : fill(t.shop.effectBought, { name: NAME_EFFECTS[id].name }))}
                      style={{ minHeight: 56, flexDirection: "row", alignItems: "center", gap: 12, paddingTop: 8, borderTopWidth: 1, borderTopColor: color.line, opacity: !owned && coins < EFFECT_PRICE ? 0.5 : 1 }}>
                      <NameText effect={id} style={{ flex: 1, fontFamily: font.displayHeavy, fontSize: 20, letterSpacing: 2, color: color.hi }}>{(player.name || t.home.defaultName).toUpperCase()}</NameText>
                      <Text style={{ fontFamily: font.bodyBold, fontSize: 12, color: on ? color.accent : color.muted }}>{on ? t.shop.wearing : owned ? NAME_EFFECTS[id].name : fill(t.shop.priceNamed, { name: NAME_EFFECTS[id].name, n: EFFECT_PRICE })}</Text>
                    </Pressable>
                  );
                })}
              </Frame>
            </>
          ) : null}

          <Frame cut={12} contentStyle={{ padding: 16, gap: 6 }}>
            <Label>{t.shop.later}</Label>
            <Text style={{ fontFamily: font.body, fontSize: 13, lineHeight: 19, color: color.muted }}>{t.shop.laterItems}</Text>
          </Frame>
        </ScrollView>
      </View>
      {unlock ? (
        <Unlock kind={t.shop.kinds[kind]} minutes={unlock.minutes} cost={unlock.cost} onClose={() => setUnlock(null)}
          onConfirm={() => buyAppTime(user.uid, kind, unlock.minutes, fill(t.shop.logTitle, { kind: t.shop.kinds[kind], min: unlock.minutes }))} />
      ) : null}
      {trollFor ? <TrollPicker name={trollFor.card?.name ?? trollFor.name} coins={coins} onPick={pickTroll} onClose={() => setTrollFor(null)} /> : null}
          </SwipeBack>
    </Modal>
  );
}
