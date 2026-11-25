// Party quests: invites, your parties (group quests and raids) and starting a new one.
import { useState } from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  GROUP_QUESTS, MAX_PARTY, RAIDS, RAID_DAYS, daysLeft, groupBonus, groupById, groupCoins, partyCleared, partyOpen, raidById, raidTarget, raidTotal,
} from "../game/party";
import { todayKey } from "../game/quests";
import { cancelParty, claimParty, createParty, declineParty, doGroupPart, joinParty, logRaid, useParties, usePartyInvites } from "../lib/party";
import { doneFeel, tapFeel } from "../lib/haptics";
import { Coins, Frame, Label, SysButton } from "./sys";
import { useTheme } from "../theme";
import { t } from "../i18n";

const fill = (s, vars) => Object.entries(vars ?? {}).reduce((acc, [k, v]) => acc.split(`{${k}}`).join(String(v)), String(s ?? ""));
const titleOf = (p) => (p.kind === "group" ? groupById[p.quest]?.title : raidById[p.raid]?.title) ?? "";

function Chip({ label, on, onPress, flex, sub }) {
  const { color, font } = useTheme();
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected: on }} onPress={onPress}
      style={{ flex: flex ? 1 : undefined, minHeight: 44, paddingHorizontal: 12, paddingVertical: 6, justifyContent: "center", alignItems: flex ? "center" : "flex-start", borderWidth: 1, borderColor: on ? color.frame : "rgba(159,203,255,0.22)", backgroundColor: on ? "rgba(159,203,255,0.16)" : "transparent" }}>
      <Text style={{ fontFamily: font.bold, fontSize: 13, color: on ? "#FFFFFF" : color.muted }}>{label}</Text>
      {sub ? <Text style={{ fontFamily: font.body, fontSize: 11, color: color.muted }}>{sub}</Text> : null}
    </Pressable>
  );
}

// One party: who's in, how far, and your action.
function PartyCard({ me, party }) {
  const { color, font } = useTheme();
  const [amount, setAmount] = useState(raidById[party.raid]?.step ?? 1);
  const [msg, setMsg] = useState(null);
  const today = todayKey();
  const cleared = partyCleared(party);
  const open = partyOpen(party, Date.now(), today);
  const raid = raidById[party.raid];
  const q = groupById[party.quest];
  const mine = party.progress?.[me];
  const claimed = party.claimed?.[me];
  const run = (p, ok) => p.then((r) => { if (r !== null) { doneFeel(); setMsg(ok?.(r) ?? null); } }).catch(() => setMsg(t.party.failed));
  const total = raidTotal(party);
  const target = raidTarget(party);

  return (
    <Frame cut={12} contentStyle={{ padding: 14, gap: 10 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Label tone={color.hi}>{party.kind === "group" ? t.party.groupKicker : t.party.raidKicker}</Label>
          <Text style={{ fontFamily: font.bold, fontSize: 17, color: "#FFFFFF" }}>{titleOf(party)}</Text>
        </View>
        <Text style={{ fontFamily: font.body, fontSize: 12, color: cleared ? color.accent : color.muted }}>
          {cleared ? t.party.cleared : party.kind === "raid" ? (open ? fill(t.party.daysLeft, { n: daysLeft(party) }) : t.party.over) : open ? t.party.today : t.party.over}
        </Text>
      </View>

      {party.kind === "raid" ? (
        <View style={{ gap: 4 }}>
          <View style={{ height: 8, backgroundColor: "rgba(159,203,255,0.12)" }}>
            <View style={{ height: 8, width: `${Math.min(100, (total / Math.max(1, target)) * 100)}%`, backgroundColor: color.purple }} />
          </View>
          <Text style={{ fontFamily: font.num, fontSize: 15, color: color.frame }}>{`${total} / ${target} ${raid?.unit ?? ""}`}</Text>
        </View>
      ) : null}

      <View style={{ gap: 4 }}>
        {party.members.map((m) => (
          <View key={m} style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ fontFamily: font.bodyMedium, fontSize: 14, color: m === me ? "#FFFFFF" : color.text }}>{m === me ? t.party.you : party.names?.[m] ?? "Player"}</Text>
            <Text style={{ fontFamily: font.body, fontSize: 13, color: party.kind === "group" ? (party.progress?.[m] === true ? color.accent : color.muted) : color.text }}>
              {party.kind === "group" ? (party.progress?.[m] === true ? t.party.done : t.party.notYet) : `${Number(party.progress?.[m]) || 0} ${raid?.unit ?? ""}`}
            </Text>
          </View>
        ))}
        {(party.invited ?? []).map((m) => (
          <View key={m} style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ fontFamily: font.bodyMedium, fontSize: 14, color: color.muted }}>{party.names?.[m] ?? "Player"}</Text>
            <Text style={{ fontFamily: font.body, fontSize: 13, color: color.muted }}>{t.party.invitedLabel}</Text>
          </View>
        ))}
      </View>

      {cleared && !claimed ? (
        <SysButton label={party.kind === "group" ? fill(t.party.claimBonus, { n: groupBonus(q) }) : fill(t.party.claimRaid, { n: raid.reward })}
          onPress={() => run(claimParty(me, party.id), (r) => fill(t.party.claimed, { n: r.coins }))} />
      ) : null}
      {cleared && claimed ? <Text style={{ fontFamily: font.body, fontSize: 13, color: color.accent }}>{t.party.claimedAlready}</Text> : null}

      {!cleared && open && party.kind === "group" && mine !== true ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <Text style={{ flex: 1, fontFamily: font.body, fontSize: 12, lineHeight: 17, color: color.muted }}>{fill(t.party.groupPays, { n: groupCoins(q), b: groupBonus(q) })}</Text>
          <SysButton label={t.party.myPart} onPress={() => run(doGroupPart(me, party.id), (r) => fill(t.party.partDone, { n: r.coins }))} style={{ minHeight: 44 }} />
        </View>
      ) : null}
      {!cleared && open && party.kind === "raid" ? (
        <View style={{ gap: 8 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Pressable accessibilityRole="button" accessibilityLabel={t.party.less} onPress={() => setAmount((a) => Math.max(raid.step, Math.round((a - raid.step) * 10) / 10))}
              style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(159,203,255,0.3)" }}>
              <Text style={{ fontFamily: font.bold, fontSize: 20, color: color.text }}>−</Text>
            </Pressable>
            <Text style={{ flex: 1, textAlign: "center", fontFamily: font.num, fontSize: 20, color: "#FFFFFF" }}>{`${amount} ${raid.unit}`}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel={t.party.more} onPress={() => setAmount((a) => Math.round((a + raid.step) * 10) / 10)}
              style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(159,203,255,0.3)" }}>
              <Text style={{ fontFamily: font.bold, fontSize: 20, color: color.text }}>+</Text>
            </Pressable>
          </View>
          <SysButton label={t.party.logIt} onPress={() => run(logRaid(me, party.id, amount), () => fill(t.party.logged, { n: amount, unit: raid.unit }))} />
          <Text style={{ fontFamily: font.body, fontSize: 12, color: color.muted }}>{fill(t.party.raidPays, { n: raid.reward })}</Text>
        </View>
      ) : null}
      {msg ? <Text style={{ fontFamily: font.body, fontSize: 13, color: color.accent }}>{msg}</Text> : null}
      {party.leader === me && !cleared ? (
        <Pressable accessibilityRole="button" onPress={() => cancelParty(party.id).catch(() => {})} style={{ minHeight: 36, justifyContent: "center", alignSelf: "flex-start" }}>
          <Text style={{ fontFamily: font.bodyBold, fontSize: 12, color: color.muted }}>{t.party.cancel}</Text>
        </Pressable>
      ) : null}
    </Frame>
  );
}

// Start a party: group quest or raid, what, how long, who.
function StartParty({ me, myName, friends, inRaid, onClose }) {
  const { color, font } = useTheme();
  const insets = useSafeAreaInsets();
  const [kind, setKind] = useState("group");
  const [what, setWhat] = useState(GROUP_QUESTS[0].id);
  const [days, setDays] = useState(5);
  const [who, setWho] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const pickKind = (k) => { setKind(k); setWhat(k === "group" ? GROUP_QUESTS[0].id : RAIDS[0].id); };
  const toggle = (f) => setWho((w) => (w.some((x) => x.uid === f.uid) ? w.filter((x) => x.uid !== f.uid) : w.length < MAX_PARTY - 1 ? [...w, f] : w));
  async function start() {
    setBusy(true);
    try { await createParty(me, myName, kind, what, who, days); doneFeel(); onClose(); } catch { setError(t.party.failed); } finally { setBusy(false); }
  }
  const raid = raidById[what];
  return (
    <Modal animationType="slide" visible onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: color.bg }}>
        <ScrollView contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 40, paddingHorizontal: 14, maxWidth: 520, width: "100%", alignSelf: "center", gap: 12 }}>
          <Pressable accessibilityRole="button" onPress={onClose} style={{ minHeight: 44, justifyContent: "center", alignSelf: "flex-start" }}>
            <Text style={{ fontFamily: font.bodyBold, fontSize: 14, color: color.accent }}>{`‹ ${t.party.back}`}</Text>
          </Pressable>
          <Text accessibilityRole="header" style={{ fontFamily: font.bold, fontSize: 24, color: "#FFFFFF" }}>{t.party.startTitle}</Text>
          <View style={{ flexDirection: "row", gap: 6 }}>
            <Chip flex label={t.party.groupKind} sub={t.party.groupKindSub} on={kind === "group"} onPress={() => pickKind("group")} />
            <Chip flex label={t.party.raidKind} sub={t.party.raidKindSub} on={kind === "raid"} onPress={() => pickKind("raid")} />
          </View>

          <Label tone={color.hi}>{kind === "group" ? t.party.pickQuest : t.party.pickRaid}</Label>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
            {(kind === "group" ? GROUP_QUESTS : RAIDS).map((x) => (
              <Chip key={x.id} label={x.title} on={what === x.id} onPress={() => setWhat(x.id)}
                sub={kind === "group" ? `${x.stat} · ${x.minutes} min` : fill(t.party.perMember, { n: x.perMember, unit: x.unit })} />
            ))}
          </View>
          {kind === "raid" ? (
            <>
              <Label tone={color.hi}>{t.party.howLong}</Label>
              <View style={{ flexDirection: "row", gap: 6 }}>
                {RAID_DAYS.map((d) => <Chip key={d} flex label={fill(t.party.days, { n: d })} on={days === d} onPress={() => setDays(d)} />)}
              </View>
              {raid ? <Text style={{ fontFamily: font.body, fontSize: 13, lineHeight: 18, color: color.muted }}>{fill(t.party.raidGoal, { n: raid.perMember * (who.length + 1), unit: raid.unit, d: days, r: raid.reward })}</Text> : null}
            </>
          ) : (
            <Text style={{ fontFamily: font.body, fontSize: 13, lineHeight: 18, color: color.muted }}>{fill(t.party.groupGoal, { n: groupCoins(groupById[what]), b: groupBonus(groupById[what]) })}</Text>
          )}

          <Label tone={color.hi}>{fill(t.party.pickFriends, { n: MAX_PARTY - 1 })}</Label>
          {friends?.length ? (
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
              {friends.map((f) => <Chip key={f.uid} label={f.card?.name ?? f.name} on={who.some((x) => x.uid === f.uid)} onPress={() => { tapFeel(); toggle({ uid: f.uid, name: f.card?.name ?? f.name }); }} />)}
            </View>
          ) : <Text style={{ fontFamily: font.body, fontSize: 13, color: color.muted }}>{t.party.noFriends}</Text>}
          {error ? <Text style={{ fontFamily: font.body, fontSize: 13, color: "#F6B45A" }}>{error}</Text> : null}
          {kind === "raid" && inRaid ? <Text style={{ fontFamily: font.body, fontSize: 13, color: "#F6B45A" }}>{t.party.oneRaid}</Text> : null}
          <SysButton label={t.party.start} disabled={busy || who.length === 0 || (kind === "raid" && inRaid)} onPress={start} />
        </ScrollView>
      </View>
    </Modal>
  );
}

// The party section for the Friends tab.
export default function PartySection({ user, player, friends }) {
  const { color, font } = useTheme();
  const [starting, setStarting] = useState(false);
  const parties = useParties(user.uid);
  const invites = usePartyInvites(user.uid);
  const today = todayKey();
  const now = Date.now();
  // Open ones, plus cleared ones you still have to claim.
  const shown = (parties ?? []).filter((p) => partyOpen(p, now, today) || (partyCleared(p) && !p.claimed?.[user.uid]))
    .sort((a, b) => b.createdAtMs - a.createdAtMs);
  const openInvites = (invites ?? []).filter((p) => partyOpen(p, now, today));
  // One raid at a time.
  const inRaid = (parties ?? []).some((p) => p.kind === "raid" && partyOpen(p, now, today) && !partyCleared(p));
  return (
    <View style={{ marginTop: 12, marginHorizontal: 14, gap: 10 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <Label tone={color.hi}>{t.party.title}</Label>
        <Pressable accessibilityRole="button" onPress={() => setStarting(true)} style={{ minHeight: 40, justifyContent: "center" }}>
          <Text style={{ fontFamily: font.bodyBold, fontSize: 13, color: color.accent }}>{t.party.new}</Text>
        </Pressable>
      </View>
      {openInvites.map((p) => (
        <Frame key={p.id} kind="premium" cut={12} contentStyle={{ padding: 14, gap: 8 }}>
          <Text style={{ fontFamily: font.body, fontSize: 13, color: color.muted }}>{fill(t.party.invite, { name: p.names?.[p.leader] ?? "A friend", kind: p.kind === "group" ? t.party.groupKind : t.party.raidKind })}</Text>
          <Text style={{ fontFamily: font.bold, fontSize: 17, color: "#FFFFFF" }}>{titleOf(p)}</Text>
          {p.kind === "group" ? <Coins value={groupCoins(groupById[p.quest]) + groupBonus(groupById[p.quest])} sign="+" size={15} /> : <Coins value={raidById[p.raid]?.reward ?? 0} sign="+" size={15} />}
          <View style={{ flexDirection: "row", gap: 6 }}>
            <Chip flex label={t.party.decline} onPress={() => declineParty(user.uid, p.id).catch(() => {})} />
            {p.kind === "raid" && inRaid ? <Chip flex label={t.party.inRaid} onPress={() => {}} /> : (
              <Chip flex on label={t.party.join} onPress={() => joinParty(user.uid, player.name, p.id).then(doneFeel).catch(() => {})} />
            )}
          </View>
        </Frame>
      ))}
      {shown.map((p) => <PartyCard key={p.id} me={user.uid} party={p} />)}
      {!shown.length && !openInvites.length ? <Text style={{ fontFamily: font.body, fontSize: 13, lineHeight: 18, color: color.muted }}>{t.party.empty}</Text> : null}
      {starting ? <StartParty me={user.uid} myName={player.name} friends={friends} inRaid={inRaid} onClose={() => setStarting(false)} /> : null}
    </View>
  );
}
