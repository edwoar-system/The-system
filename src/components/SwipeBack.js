// Swipe from the left edge to go back, like everywhere on iPhone. Wrap a full-screen page in it; taps and
// vertical scrolling inside still work, only a sideways swipe that starts at the edge is taken.
import { useEffect, useMemo, useRef } from "react";
import { PanResponder, Platform, View } from "react-native";

const EDGE = 30;

export function useSwipeBack(onBack, enabled = true) {
  const back = useRef(onBack);
  useEffect(() => { back.current = onBack; }, [onBack]);
  return useMemo(() => {
    if (Platform.OS === "web" || !enabled) return {};
    return PanResponder.create({
      // Bubbling, not capture: the innermost page (a skill page inside a tab) gets the swipe first.
      onMoveShouldSetPanResponder: (e, g) => g.x0 < EDGE && g.dx > 14 && Math.abs(g.dy) < g.dx * 0.6,
      onPanResponderTerminationRequest: () => false,
      onPanResponderRelease: (e, g) => { if (g.dx > 70 || g.vx > 0.5) back.current?.(); },
    }).panHandlers;
  }, [enabled]);
}

export default function SwipeBack({ onBack, enabled = true, style, children }) {
  const pan = useSwipeBack(onBack, enabled);
  return <View style={[{ flex: 1 }, style]} {...pan}>{children}</View>;
}
