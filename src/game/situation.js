// Your situation from your position: travelling, home, school or work, training, or out. Pure, no device calls.
export const SITUATIONS = ["home", "school", "training", "travelling", "out"];

// Distance in metres between two { lat, lon }.
export function metres(a, b) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// pos, prev: { lat, lon, speed, at }. places: { home, school } you saved. atSport: a training place is right here.
export function situationFrom({ pos, prev = null, places = {}, atSport = false }) {
  if (!pos) return null;
  // Faster than about 22 km/h (a bike sprint at most): a train, bus or car.
  const speed = pos.speed != null && pos.speed >= 0 ? pos.speed : prev && pos.at > prev.at ? metres(prev, pos) / ((pos.at - prev.at) / 1000) : 0;
  if (speed > 6 && (!prev || pos.at - prev.at < 15 * 60000 || pos.speed != null)) return "travelling";
  if (places?.home && metres(places.home, pos) < 150) return "home";
  if (places?.school && metres(places.school, pos) < 200) return "school";
  if (atSport) return "training";
  return "out";
}
