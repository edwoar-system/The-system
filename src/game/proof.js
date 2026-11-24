// Proof: a photo or screenshot (a Strava run, the bar with your weights) on a quest.
// You choose in Settings which quests ask for it. Skipping still counts the quest, but the
// quest log (and later your friends) sees "no proof".
export const PROOF_KINDS = ["trial", "urgent", "main", "guild"];
export const PROOF_DEFAULTS = { trial: true, urgent: false, main: false, guild: false };

export function proofSettings(player) {
  return { ...PROOF_DEFAULTS, ...(player?.proof ?? {}) };
}

// slot: the quest slot from completeQuest ("main", "trial", "guild", ...) or "urgent".
export function needsProof(player, slot) {
  return PROOF_KINDS.includes(slot) && !!proofSettings(player)[slot];
}

// The how-did-it-go / did-you-cheat questions: only after the important quests.
export const ASK_SLOTS = ["main", "trial", "urgent"];
