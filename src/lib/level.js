// Level-up rewards: claimed once per level, whatever gave the EXP (quests, courses, pages, challenges).
// Players from before this start counting from the level they have (no back pay).
import { useEffect, useRef } from "react";
import { deleteField, doc, runTransaction, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";
import { showSystem } from "./popup";
import { levelFromXp } from "../game/economy";
import { levelRewards } from "../game/levelRewards";
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
      ...(p.statPoints != null ? { statPoints: deleteField() } : {}),
      coins: (p.coins ?? 0) + coins,
      ...(shields ? { streakShields: Math.min(MAX_SHIELDS, (p.streakShields ?? 0) + shields) } : {}),
      updatedAt: serverTimestamp(),
    }, { merge: true });
    return { level, coins, shields, first };
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
      if (!r || (!r.coins && !r.shields)) return;
      showSystem({
        title: fill(t.levelUp.rewardTitle, { n: r.level }),
        lines: [
          ...(r.coins ? [fill(t.levelUp.rewardCoins, { n: r.coins })] : []),
          ...(r.shields ? [t.levelUp.rewardShield] : []),
        ],
        tone: "buff",
      });
    }).catch(() => {}).finally(() => { busy.current = false; });
  }, [uid, player, level, paid]);
}
