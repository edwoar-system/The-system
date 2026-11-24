// Writing muscle training to the player: this week's load and each muscle's fatigue.
// Merge writes keep old map keys, so keys from the old 14-group weeks are deleted when a week is rewritten,
// and weeks before last week are dropped.
import { deleteField } from "firebase/firestore";
import { addFatigue, addLoad, coverage, muscleById, weekLoad } from "../game/muscles";

// Returns the fields to write ({ muscleLoad, fatigue }) and a summary for the body report, or null.
export function trainMuscles(player, load, week, now = Date.now()) {
  if (!load || !Object.keys(load).length) return null;
  const { load: before } = weekLoad(player.muscleLoad, week);
  const after = addLoad(before, load);
  const weekWrite = { ...after };
  Object.keys(player.muscleLoad?.[week] ?? {}).forEach((k) => { if (!muscleById[k]) weekWrite[k] = deleteField(); });
  const muscleLoad = { [week]: weekWrite };
  Object.keys(player.muscleLoad ?? {}).forEach((k) => { if (Number(k) < week - 1) muscleLoad[k] = deleteField(); });
  const fatigue = addFatigue(player.fatigue, load, now);
  const fatigueWrite = { ...fatigue };
  Object.keys(player.fatigue ?? {}).forEach((k) => { if (!fatigue[k]) fatigueWrite[k] = deleteField(); });
  return {
    fields: { muscleLoad, fatigue: fatigueWrite },
    report: { hit: load, load: after, before: coverage(before), after: coverage(after), fatigue },
  };
}
