// Status effects: buffs and debuffs from how you're doing today, shown as bars and labels on Status.
// They're small on purpose: together they change your EXP by at most 15% either way.
import { quickToday } from "./quick";
import { todayKey } from "./quests";
import { skillView } from "./skills";
import { tiredSet } from "./muscles";

export const WATER_GOAL = 10; // glasses of 250 ml, 2.5 litres
export const EFFECT_CAP = 15;

// Each effect: { id, kind: "buff" | "debuff" | "info", pct (EXP %), vars (for the text) }.
// Bars: { hydration: { value, max }, sleep: { value (hours), max: 8, quality } }.
export function statusEffects(player, now = new Date()) {
  const out = [];
  const hour = now.getHours() + now.getMinutes() / 60;

  // Water
  const glasses = quickToday(player).water ?? 0;
  const goal = player?.profile?.waterGoal ?? WATER_GOAL;
  if (glasses >= goal) out.push({ id: "hydrated", kind: "buff", pct: 5 });
  else if (hour >= 15 && glasses < goal * 0.4) out.push({ id: "thirsty", kind: "debuff", pct: -5, vars: { n: glasses } });

  // Last night's sleep (logged on the morning you woke up)
  const night = player?.sleepLog?.[todayKey(now)];
  let sleep = null;
  if (night) {
    const [bed, wake, quality] = night;
    const hours = Math.round(((wake - (bed < 12 ? bed + 24 : bed) + 24) % 24) * 10) / 10;
    sleep = { value: hours, max: 8, quality: quality ?? null };
    if (hours < 6 || (quality != null && quality <= 2)) out.push({ id: "badSleep", kind: "debuff", pct: -10, vars: { h: hours } });
    else if (hours >= 7.5 && (quality == null || quality >= 4)) out.push({ id: "rested", kind: "buff", pct: 10, vars: { h: hours } });
  }

  // Muscles still recovering
  const sore = [...tiredSet(player?.fatigue, now.getTime())];
  if (sore.length) out.push({ id: "sore", kind: "info", pct: 0, vars: { n: sore.length } });

  // Skills going rusty
  const rusty = Object.entries(player?.skills ?? {}).filter(([id, e]) => { try { const v = skillView(id, e); return v.draining || v.rusty; } catch { return false; } });
  if (rusty.length) out.push({ id: "rusty", kind: "debuff", pct: 0, vars: { n: rusty.length } });

  return { effects: out, bars: { hydration: { value: glasses, max: goal }, sleep } };
}

// Total EXP change from effects, as a factor (0.85 – 1.15).
export function effectFactor(player, now = new Date()) {
  const sum = statusEffects(player, now).effects.reduce((a, e) => a + e.pct, 0);
  return 1 + Math.max(-EFFECT_CAP, Math.min(EFFECT_CAP, sum)) / 100;
}
