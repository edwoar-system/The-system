// First-time System setup on the Status screen: the penalty severity,
// confirmed with a lock-in moment. Afterwards the settings live in the Settings tab.
import { useRef, useState } from "react";
import { Animated, Easing, Text, View } from "react-native";
import Svg, { Path, Polygon } from "react-native-svg";
import { lockSetup } from "../lib/player";
import { askNotifyPermission } from "../lib/notify";
import { severityFor } from "../game/penalty";
import { todayKey } from "../game/quests";
import { Frame, Label, SysButton, hexPoints, nativeDriver } from "./sys";
import { SeverityChips } from "./systemChoices";
import { useTheme } from "../theme";
import { t } from "../i18n";
import { lockFeel } from "../lib/haptics";

function LockMark({ shackle }) {
  const { color } = useTheme();
  return (
    <View style={{ width: 84, height: 94, alignItems: "center", justifyContent: "center" }}>
      <Svg width={84} height={94} style={{ position: "absolute" }}>
        <Polygon points={hexPoints(84, 94, 2)} fill={color.panelBottom} stroke={color.frame} strokeWidth={2} />
        <Polygon points={hexPoints(84, 94, 10)} fill="none" stroke={color.accent} strokeOpacity={0.3} strokeWidth={1} />
      </Svg>
      <Animated.View style={{ position: "absolute", top: 22, transform: [{ translateY: shackle }] }}>
        <Svg width={28} height={22}><Path d="M5 22 V12 a9 9 0 0 1 18 0 V22" fill="none" stroke="#FFFFFF" strokeWidth={3.5} /></Svg>
      </Animated.View>
      <View style={{ position: "absolute", top: 42, width: 36, height: 28, backgroundColor: "#FFFFFF", alignItems: "center", justifyContent: "center" }}>
        <View style={{ width: 4, height: 10, backgroundColor: color.panelBottom }} />
      </View>
    </View>
  );
}

export default function Setup({ user, player, onLocking, onDone }) {
  const { color, font } = useTheme();
  const [severity, setSeverity] = useState(severityFor(player, todayKey()));
  const [locking, setLocking] = useState(false);
  const [error, setError] = useState(false);
  const a = useRef(new Animated.Value(0)).current;

  async function lock() {
    setError(false);
    setLocking(true);
    onLocking?.();
    lockFeel();
    a.setValue(0);
    // After the lock-in, ask once for notifications (urgent quests and the deadline need them).
    Animated.timing(a, { toValue: 1, duration: 2200, easing: Easing.linear, useNativeDriver: nativeDriver }).start(({ finished }) => {
      if (!finished) return;
      onDone?.();
      askNotifyPermission().catch(() => {});
    });
    try {
      await lockSetup(user.uid, { penaltySeverity: severity });
    } catch {
      a.stopAnimation();
      setLocking(false);
      setError(true);
      onDone?.();
    }
  }

  const at = (s, e, from = 0, to = 1) => a.interpolate({ inputRange: [0, s, e, 1], outputRange: [from, from, to, to], extrapolate: "clamp" });
  const shackle = a.interpolate({ inputRange: [0, 0.18, 0.3, 0.34, 1], outputRange: [-10, -10, 2, 0, 0] });
  const markScale = a.interpolate({ inputRange: [0, 0.05, 0.16, 0.3, 0.36, 1], outputRange: [0.6, 0.6, 1, 1, 1.08, 1] });
  const fadeAll = at(0.86, 1, 1, 0);

  return (
    <Animated.View style={{ marginTop: 22, marginHorizontal: 14, opacity: locking ? fadeAll : 1 }}>
      <Frame kind="premium" cut={16} contentStyle={{ padding: 16, gap: 14 }}>
        <Animated.View style={{ gap: 14, opacity: locking ? at(0, 0.14, 1, 0.05) : 1 }} pointerEvents={locking ? "none" : "auto"}>
          <View style={{ gap: 4 }}>
            <Label tone={color.hi}>{t.setup.title}</Label>
            <Text style={{ fontFamily: font.body, fontSize: 13, lineHeight: 18, color: color.muted }}>{t.setup.sub}</Text>
          </View>
          <View style={{ gap: 8 }}>
            <Label>{t.penalty.severity.toUpperCase()}</Label>
            <SeverityChips value={severity} onChange={setSeverity} disabled={locking} />
          </View>
          {error ? <Text style={{ fontFamily: font.bodyMedium, fontSize: 13, color: color.dangerSoft }}>{t.sheet.failed}</Text> : null}
          <SysButton label={t.setup.lock} onPress={lock} disabled={locking} />
        </Animated.View>

        {locking ? (
          <View pointerEvents="none" style={{ position: "absolute", left: 0, right: 0, top: 0, bottom: 0, alignItems: "center", justifyContent: "center", gap: 12 }}>
            <Animated.View style={{ opacity: at(0.02, 0.12), transform: [{ scale: markScale }] }}><LockMark shackle={shackle} /></Animated.View>
            <Animated.Text style={{ fontFamily: font.displayHeavy, fontSize: 26, letterSpacing: 6, color: "#FFFFFF", opacity: at(0.34, 0.46) }}>{t.setup.locked}</Animated.Text>
            <Animated.Text style={{ fontFamily: font.body, fontSize: 13, color: color.muted, opacity: at(0.44, 0.56) }}>{t.setup.lockedSub}</Animated.Text>
          </View>
        ) : null}
      </Frame>
    </Animated.View>
  );
}
