// Quest history: the latest entries of players/{uid}/log.
import { useEffect, useState } from "react";
import { collection, getDocs, limit, orderBy, query } from "firebase/firestore";
import { db } from "./firebase";

export function useHistory(uid, n = 40) {
  const [state, setState] = useState({ items: null, error: false });
  useEffect(() => {
    if (!uid) return;
    let alive = true;
    getDocs(query(collection(db, "players", uid, "log"), orderBy("at", "desc"), limit(n)))
      .then((snap) => { if (alive) setState({ items: snap.docs.map((d) => ({ id: d.id, ...d.data() })), error: false }); })
      .catch(() => { if (alive) setState({ items: [], error: true }); });
    return () => { alive = false; };
  }, [uid, n]);
  return state;
}
