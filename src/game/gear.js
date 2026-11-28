// What a skill needs before you can train it at home. The System asks once (profile.gear[skill]: true = you have
// it, false = not yet). Not yet = that skill's quest becomes "get it" first, so you never get a quest you can't do.
export const GEAR = {
  juggling: { need: "3 balls", get: "Get 3 balls to juggle with", how: "Juggling balls are cheap, but 3 rolled-up pairs of socks or 3 tennis balls work to start." },
  rope: { need: "a jump rope", get: "Get a jump rope", how: "Any sports shop has one. Until then, jumping without a rope counts as warm-up." },
  kettlebell: { need: "a kettlebell (or a heavy backpack)", get: "Get something to swing", how: "A backpack with books or water bottles works. A 12–16 kg kettlebell if you want the real one." },
  cube: { need: "a Rubik's cube", get: "Get a Rubik's cube", how: "A cheap speed cube turns better than the old kind." },
  pullups: { need: "a pull-up bar (or a playground nearby)", get: "Find somewhere to do pull-ups", how: "A doorway bar for home, or find a playground or park bar near you." },
  music: { need: "an instrument", get: "Get access to an instrument", how: "Borrow one, rent one, or start with a free piano or guitar app." },
  skate: { need: "a skateboard", get: "Get a skateboard", how: "Borrow one first to see if you like it. A helmet is a good idea too." },
  tennis: { need: "a racket and someone to play with", get: "Sort out a racket and a court", how: "Many clubs lend rackets. Ask a friend or book a lesson." },
  golf: { need: "clubs (or a range that lends them)", get: "Find clubs or a driving range", how: "Most driving ranges rent clubs and sell a bucket of balls." },
};

export const gearOf = (skill) => GEAR[skill] ?? null;
// undefined = not asked yet, true = have it, false = not yet.
export const hasGear = (profile, skill) => profile?.gear?.[skill];

// The "get it first" quest that replaces a skill's quest while you don't have the gear.
export function gearQuest(q, profile) {
  const g = q?.skill ? GEAR[q.skill] : null;
  if (!g || hasGear(profile, q.skill) !== false) return q;
  return { id: q.id, title: g.get, how: g.how, stat: q.stat, minutes: 15, difficulty: "easy", type: "prep", gearFor: q.skill };
}
