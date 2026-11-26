// Level-up rewards: claimed once per level, whatever gave the EXP (quests, courses, pages, challenges).
// Players from before this get the stat points for the levels they already have (no coins for those).
import { useEffect, useRef } from "react";
import { doc, runTransaction, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";
import { showSystem } from "./popup";
import { levelFromXp, statValue } from "../game/economy";
import { levelRewards, xpForStatValue } from "../game/levelRewards";
import { MAX_SHIELDS } from "../game/shop";
import { t } from "../i18n";

const fill = (s, vars) => Object.entries(vars ?? {}).reduce((acc, [k, v]) => acc.split(`{${k}}`).join(String(v)), String(s ?? ""));
const ref = (uid) => doc(db, "players", uid);

export async function claimLevel(uid) {
  return runTransaction(db, async (tx) => {
    const p = (await tx.get(ref(uid))).data() ?? {};
    const level = levelFromXp(p.xp ?? 0).level;
    const paid = p.levelPaid ?? null;
    if (paid != null && level <= paid) return null;
    const first = paid == null;
    const r = levelRewards(first ? 1 : paid, level);
    const coins = first ? 0 : r.coins;
    const shields = first ? 0 : r.shields;
    tx.set(ref(uid), {
      levelPaid: level,
      statPoints: (p.statPoints ?? 0) + r.points,
      coins: (p.coins ?? 0) + coins,
      ...(shields ? { streakShields: Math.min(MAX_SHIELDS, (p.streakShields ?? 0) + shields) } : {}),
      updatedAt: serverTimestamp(),
    }, { merge: true });
    return { level, points: r.points, coins, shields, first };
  });
}

// Spend one stat point: the stat goes up by one.
export async function spendStatPoint(uid, stat) {
  return runTransaction(db, async (tx) => {
    const p = (await tx.get(ref(uid))).data() ?? {};
    if ((p.statPoints ?? 0) <= 0) throw new Error("no-points");
    const xp = p.statXp?.[stat] ?? 0;
    const next = xpForStatValue(statValue(xp) + 1);
    tx.set(ref(uid), { statPoints: p.statPoints - 1, statXp: { ...(p.statXp ?? {}), [stat]: Math.max(xp, next) }, updatedAt: serverTimestamp() }, { merge: true });
  });
}

// Watches your level and claims rewards when it goes up; the System tells you what you got.
export function useLevelRewards(uid, player) {
  const busy = useRef(false);
  const level = player ? levelFromXp(player.xp ?? 0).level : 0;
  const paid = player?.levelPaid ?? null;
  useEffect(() => {
    if (!player || busy.current || (paid != null && level <= paid)) return;
    busy.current = true;
    claimLevel(uid).then((r) => {
      if (!r || !r.points) return;
      showSystem({
        title: r.first ? t.levelUp.pointsFirst : fill(t.levelUp.rewardTitle, { n: r.level }),
        lines: [
          fill(t.levelUp.rewardPoints, { n: r.points }),
          ...(r.coins ? [fill(t.levelUp.rewardCoins, { n: r.coins })] : []),
          ...(r.shields ? [t.levelUp.rewardShield] : []),
          t.levelUp.spendHint,
        ],
        tone: "buff",
      });
    }).catch(() => {}).finally(() => { busy.current = false; });
  }, [uid, player, level, paid]);
}
