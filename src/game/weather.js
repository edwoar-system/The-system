// When is the weather bad for an outdoor quest? Uses WMO weather codes (as Open-Meteo gives them).
// Rain, snow, showers and thunder; strong wind; or real cold or heat.
const BAD_CODES = [
  51, 53, 55, 56, 57, // drizzle, freezing drizzle
  61, 63, 65, 66, 67, // rain, freezing rain
  71, 73, 75, 77, // snow
  80, 81, 82, 85, 86, // showers
  95, 96, 99, // thunderstorm
];
export const WEATHER_BONUS = 0.25; // going out anyway in bad weather pays 25% more

// w: { code, temp (°C), wind (km/h), rain (mm) }. Returns null (fine) or the reason: "rain" | "snow" | "storm" | "wind" | "cold" | "heat".
export function badWeather(w) {
  if (!w) return null;
  if ([95, 96, 99].includes(w.code)) return "storm";
  if ([71, 73, 75, 77, 85, 86].includes(w.code)) return "snow";
  if (BAD_CODES.includes(w.code) || (w.rain ?? 0) >= 0.5) return "rain";
  if ((w.wind ?? 0) >= 40) return "wind";
  if ((w.temp ?? 10) <= -5) return "cold";
  if ((w.temp ?? 10) >= 33) return "heat";
  return null;
}
