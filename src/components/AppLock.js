import { useState } from "react";
import { Text, View } from "react-native";
import { AppPicker, blockerAvailable, MIN_UNLOCK_MINUTES, useBlocker } from "../lib/blocker";
import { addCoins, spendCoins } from "../lib/player";
import { Button, Panel } from "./ui";
import { useTheme } from "../theme";
import { t } from "../i18n";

const COINS_PER_MINUTE = 1; // placeholder until the economy formula (room 2)
const UNLOCK_OPTIONS = [MIN_UNLOCK_MINUTES, 30, 60];
const fill = (s, vars) => Object.entries(vars).reduce((acc, [k, v]) => acc.replace(`{${k}}`, v), s);

export default function AppLock({ uid, coins }) {
  const { color, font } = useTheme();
  const b = useBlocker();
  const [picking, setPicking] = useState(false);
  const [pending, setPending] = useState(null);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const body = (text, c = color.muted) => (
    <Text style={{ fontFamily: font.body, fontSize: 15, lineHeight: 22, color: c }}>{text}</Text>
  );

  if (!blockerAvailable) return <Panel title={t.blocker.title}>{body(t.blocker.webOnly)}</Panel>;
  if (!b.available) return <Panel title={t.blocker.title}>{body(t.blocker.unavailable)}</Panel>;

  if (!b.authorized) {
    return (
      <Panel title={t.blocker.title}>
        {body(b.status === 1 ? t.blocker.denied : t.blocker.authIntro, b.status === 1 ? color.danger : color.muted)}
        <Button label={t.blocker.authorize} onPress={b.authorize} />
      </Panel>
    );
  }

  async function unlock(minutes) {
    const cost = minutes * COINS_PER_MINUTE;
    setMessage("");
    setBusy(true);
    try {
      await spendCoins(uid, cost, `unlock ${minutes} min`);
    } catch {
      setMessage(t.blocker.notEnough);
      setBusy(false);
      return;
    }
    try {
      await b.unlockFor(minutes);
    } catch {
      await addCoins(uid, cost); // refund: the apps stayed locked
      setMessage(t.blocker.unlockFailed);
    }
    setBusy(false);
  }

  return (
    <Panel title={t.blocker.title}>
      {picking && AppPicker ? (
        <AppPicker
          style={{ width: 1, height: 1, position: "absolute" }}
          familyActivitySelection={b.allowedSelection}
          onSelectionChange={(e) => setPending(e.nativeEvent.familyActivitySelection)}
          onDismissRequest={() => {
            if (pending) b.saveAllowed(pending);
            setPicking(false);
          }}
        />
      ) : null}

      <Text style={{ fontFamily: font.display, fontSize: 15, color: color.text }}>{t.blocker.allowedTitle}</Text>
      {body(t.blocker.allowedHint)}
      {body(b.allowedSelection ? t.blocker.allowedSome : t.blocker.allowedNone, b.allowedSelection ? color.accent : color.muted)}
      <Button kind="secondary" label={t.blocker.pickAllowed} onPress={() => setPicking(true)} />

      <View style={{ height: 1, backgroundColor: color.line, marginVertical: 6 }} />

      {!b.active ? (
        <>
          {body(t.blocker.off)}
          <Button label={t.blocker.turnOn} disabled={!b.allowedSelection} onPress={b.turnOn} />
        </>
      ) : (
        <>
          <Text style={{ fontFamily: font.display, fontSize: 18, color: b.unlocked ? color.reward : color.text }}>
            {b.unlocked ? fill(t.blocker.unlockedFor, { m: b.minutesLeft }) : t.blocker.locked}
          </Text>
          {b.unlocked ? (
            <Button kind="secondary" label={t.blocker.lockEarly} onPress={b.lockEarly} />
          ) : (
            <>
              <Text style={{ fontFamily: font.display, fontSize: 15, color: color.text, marginTop: 4 }}>{t.blocker.unlockTitle}</Text>
              {body(t.blocker.unlockHint)}
              {UNLOCK_OPTIONS.map((m) => (
                <Button key={m} label={fill(t.blocker.unlockButton, { m, c: m * COINS_PER_MINUTE })}
                  disabled={busy || coins < m * COINS_PER_MINUTE} onPress={() => unlock(m)} />
              ))}
            </>
          )}
          {message ? <Text style={{ fontFamily: font.bodyMedium, fontSize: 14, color: color.danger }}>{message}</Text> : null}
          <Button kind="text" label={t.blocker.turnOff} onPress={b.turnOff} style={{ alignSelf: "flex-start", paddingHorizontal: 0 }} />
        </>
      )}
    </Panel>
  );
}
