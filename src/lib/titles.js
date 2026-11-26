// Titles: wear one, and the System tells you when you earn a new one (game/titles.js).
import { useEffect, useRef } from "react";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "./firebase";
import { showSystem } from "./popup";
import { earnedTitles, titleById } from "../game/titles";
import { t } from "../i18n";

const fill = (s, vars) => Object.entries(vars ?? {}).reduce((acc, [k, v]) => acc.split(`{${k}}`).join(String(v)), String(s ?? ""));

export const wearTitle = (uid, id) => setDoc(doc(db, "players", uid), { title: id ?? null, updatedAt: serverTimestamp() }, { merge: true });

// New titles since last time: a System window. Your very first title goes on by itself.
export function useTitleAlerts(uid, player) {
  const busy = useRef(false);
  const earned = player ? earnedTitles(player) : [];
  const seen = player?.titlesSeen ?? [];
  const fresh = earned.filter((id) => !seen.includes(id));
  const key = fresh.join(",");
  useEffect(() => {
    if (!player || !key || busy.current) return;
    busy.current = true;
    const ids = key.split(",");
    const first = player.title == null ? ids[ids.length - 1] : null;
    setDoc(doc(db, "players", uid), { titlesSeen: [...new Set([...(player.titlesSeen ?? []), ...ids])], ...(first ? { title: first } : {}), updatedAt: serverTimestamp() }, { merge: true })
      .then(() => {
        const names = ids.map((id) => titleById[id]?.name).filter(Boolean);
        showSystem({
          title: names.length === 1 ? t.titles.newOne : fill(t.titles.newMany, { n: names.length }),
          lines: [
            ...names.slice(0, 4).map((n) => `「${n}」`),
            ...(names.length > 4 ? [fill(t.titles.andMore, { n: names.length - 4 })] : []),
            first ? fill(t.titles.wearingNow, { name: titleById[first]?.name }) : t.titles.wearHint,
          ],
          tone: "buff",
        });
      })
      .catch(() => {})
      .finally(() => { busy.current = false; });
  }, [uid, player, key]);
}
