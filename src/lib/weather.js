// The weather where you are (Open-Meteo: free, no account). Needs your location, or your saved home.
// Checked when the app opens and every 30 minutes while it's open.
import { useEffect, useState } from "react";
import { here } from "./location";
import { badWeather } from "../game/weather";

let now = null; // { code, temp, wind, rain, at, bad }
const listeners = new Set();
export const weatherNow = () => (now && Date.now() - now.at < 2 * 3600000 ? now : null);

export async function refreshWeather(player) {
  if (now && Date.now() - now.at < 30 * 60000) return now;
  const pos = (player?.locationOn ? await here({ maxAgeMs: 10 * 60000 }) : null) ?? player?.places?.home ?? null;
  if (!pos) return null;
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${pos.lat.toFixed(3)}&longitude=${pos.lon.toFixed(3)}&current=temperature_2m,precipitation,weather_code,wind_speed_10m`;
  try {
    const res = await fetch(url);
    if (!res.ok) return now;
    const c = (await res.json()).current ?? {};
    const w = { code: c.weather_code, temp: c.temperature_2m, wind: c.wind_speed_10m, rain: c.precipitation, at: Date.now() };
    now = { ...w, bad: badWeather(w) };
    listeners.forEach((f) => f(now));
  } catch {
    // Keep the last answer.
  }
  return now;
}

export function useWeather(player) {
  const [w, setW] = useState(weatherNow());
  const on = !!player?.locationOn || !!player?.places?.home;
  useEffect(() => {
    listeners.add(setW);
    return () => listeners.delete(setW);
  }, []);
  useEffect(() => {
    if (!on) return;
    let alive = true;
    const tick = () => { if (alive) refreshWeather(player).catch(() => {}); };
    tick();
    const id = setInterval(tick, 30 * 60000);
    return () => { alive = false; clearInterval(id); };
    // Only whether location is on matters here, not every change to the player.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [on]);
  return on ? w : null;
}
