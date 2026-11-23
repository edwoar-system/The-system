// iPhone: block (almost) all apps with Apple's Screen Time API and unlock them for a while with coins.
//
// How it works
// - "Block-all mode" shields every app except the ones on your allowed list (and Apple's essentials like Phone).
// - Unlocking turns block-all mode off and starts a one-off Screen Time schedule that ends after X minutes.
//   When it ends, the Screen Time extension turns block-all mode back on, even if The System is closed.
// - Apple requires a schedule of at least 15 minutes, so unlocks come in blocks of 15 minutes or more.
// - Screen Time data never leaves the phone. Only coins and the unlock end time are saved to the database.
import { useCallback, useEffect, useState } from "react";
import * as RNDA from "react-native-device-activity";
import { t } from "../i18n";

export const blockerAvailable = true;
export const MIN_UNLOCK_MINUTES = 15;

const ALLOWED_ID = "always_allowed";
const UNLOCK_ACTIVITY = "coin_unlock";
const KEY_ACTIVE = "system_blocking_active";
const KEY_UNLOCK_UNTIL = "system_unlock_until";
const SHIELD_ID = "system";

function shieldColors() {
  return {
    backgroundColor: { red: 10, green: 15, blue: 28 },
    titleColor: { red: 230, green: 238, blue: 255 },
    subtitleColor: { red: 127, green: 141, blue: 173 },
    primaryButtonBackgroundColor: { red: 142, green: 197, blue: 255 },
    primaryButtonLabelColor: { red: 10, green: 15, blue: 28 },
    iconTint: { red: 142, green: 197, blue: 255 },
  };
}

function applyShield() {
  const config = {
    ...shieldColors(),
    title: t.blocker.shieldTitle,
    subtitle: t.blocker.shieldSubtitle,
    primaryButtonLabel: t.blocker.shieldButton,
    iconSystemName: "lock.shield",
  };
  const actions = { primary: { behavior: "close" } };
  RNDA.updateShield(config, actions);
  RNDA.updateShieldWithId(config, actions, SHIELD_ID);
}

function timeComponents(date) {
  return {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
    hour: date.getHours(),
    minute: date.getMinutes(),
    second: date.getSeconds(),
  };
}

function lockNow() {
  RNDA.stopMonitoring([UNLOCK_ACTIVITY]);
  RNDA.enableBlockAllMode("system_lock");
  RNDA.userDefaultsRemove(KEY_UNLOCK_UNTIL);
}

export function useBlocker() {
  const [status, setStatus] = useState(RNDA.getAuthorizationStatus());
  const [active, setActive] = useState(!!RNDA.userDefaultsGet(KEY_ACTIVE));
  const [unlockUntil, setUnlockUntil] = useState(RNDA.userDefaultsGet(KEY_UNLOCK_UNTIL) ?? null);
  const [allowedSelection, setAllowedSelection] = useState(RNDA.getFamilyActivitySelectionId(ALLOWED_ID) ?? null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const sub = RNDA.onAuthorizationStatusChange?.(({ authorizationStatus }) => setStatus(authorizationStatus));
    return () => sub?.remove?.();
  }, []);

  // Tick every 15 s so the remaining unlock time stays fresh. If an unlock ended while the app was open, tidy up.
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    if (active && unlockUntil && now >= unlockUntil) {
      lockNow();
      setUnlockUntil(null);
    }
  }, [now, active, unlockUntil]);

  const authorized = status === RNDA.AuthorizationStatus.approved;

  const authorize = useCallback(async () => {
    try {
      await RNDA.requestAuthorization("individual");
    } finally {
      setStatus(await RNDA.pollAuthorizationStatus({ pollIntervalMs: 500, maxAttempts: 10 }).catch(() => RNDA.getAuthorizationStatus()));
    }
  }, []);

  const saveAllowed = useCallback((selection) => {
    setAllowedSelection(selection);
    RNDA.setFamilyActivitySelectionId({ id: ALLOWED_ID, familyActivitySelection: selection });
    RNDA.clearWhitelist();
    if (selection) RNDA.addSelectionToWhitelistAndUpdateBlock({ activitySelectionId: ALLOWED_ID }, "system_allowed");
  }, []);

  const turnOn = useCallback(() => {
    applyShield();
    lockNow();
    RNDA.userDefaultsSet(KEY_ACTIVE, true);
    setActive(true);
    setUnlockUntil(null);
  }, []);

  const turnOff = useCallback(() => {
    RNDA.stopMonitoring([UNLOCK_ACTIVITY]);
    RNDA.disableBlockAllMode("system_off");
    RNDA.userDefaultsSet(KEY_ACTIVE, false);
    RNDA.userDefaultsRemove(KEY_UNLOCK_UNTIL);
    setActive(false);
    setUnlockUntil(null);
  }, []);

  // Opens the apps for `minutes`. Throws if Screen Time refuses the schedule; then everything stays locked.
  const unlockFor = useCallback(async (minutes) => {
    const m = Math.max(MIN_UNLOCK_MINUTES, Math.round(minutes));
    const start = new Date(Date.now() + 2000);
    const end = new Date(start.getTime() + m * 60000);
    RNDA.stopMonitoring([UNLOCK_ACTIVITY]);
    RNDA.configureActions({
      activityName: UNLOCK_ACTIVITY,
      callbackName: "intervalDidEnd",
      actions: [{ type: "enableBlockAllMode", shieldId: SHIELD_ID }],
    });
    try {
      await RNDA.startMonitoring(UNLOCK_ACTIVITY, { intervalStart: timeComponents(start), intervalEnd: timeComponents(end), repeats: false }, []);
    } catch (e) {
      lockNow();
      throw e;
    }
    RNDA.disableBlockAllMode("coin_unlock");
    RNDA.userDefaultsSet(KEY_UNLOCK_UNTIL, end.getTime());
    setUnlockUntil(end.getTime());
    return end.getTime();
  }, []);

  const lockEarly = useCallback(() => {
    lockNow();
    setUnlockUntil(null);
  }, []);

  const unlocked = active && unlockUntil && now < unlockUntil;
  const minutesLeft = unlocked ? Math.ceil((unlockUntil - now) / 60000) : 0;

  return {
    available: RNDA.isAvailable?.() ?? true,
    status, authorized, authorize,
    active, turnOn, turnOff,
    allowedSelection, saveAllowed,
    unlocked, minutesLeft, unlockFor, lockEarly,
  };
}

export { DeviceActivitySelectionSheetView as AppPicker } from "react-native-device-activity";
