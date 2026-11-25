// A square to write a sign in with your finger. mode "trace": the sign shows faintly underneath, write over it.
// mode "memory": an empty square; after "Check" the sign appears over what you wrote, so you can compare.
import { useRef, useState } from "react";
import { PanResponder, View } from "react-native";
import Svg, { Path, Text as SvgText } from "react-native-svg";
import { useTheme } from "../theme";

const SIZE = 260;

// To clear it, the parent gives it a new key (a fresh pad).
export default function WritePad({ glyph, mode = "trace", reveal = false, onStroke }) {
  const { color } = useTheme();
  const [strokes, setStrokes] = useState([]);
  const cur = useRef(null);
  const [live, setLive] = useState(null);

  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderTerminationRequest: () => false,
    onPanResponderGrant: (e) => {
      const { locationX: x, locationY: y } = e.nativeEvent;
      cur.current = [[x, y]];
      setLive(cur.current.slice());
    },
    onPanResponderMove: (e) => {
      const { locationX: x, locationY: y } = e.nativeEvent;
      if (!cur.current) return;
      cur.current.push([x, y]);
      setLive(cur.current.slice());
    },
    onPanResponderRelease: () => {
      const s = cur.current;
      cur.current = null;
      setLive(null);
      if (s?.length) { setStrokes((list) => [...list, s]); onStroke?.(); }
    },
  })).current;

  const toPath = (pts) => (pts.length === 1 ? `M${pts[0][0]} ${pts[0][1]} l0.1 0` : `M${pts.map(([x, y]) => `${x} ${y}`).join(" L")}`);
  const glyphSize = glyph.length > 1 ? SIZE * 0.42 : SIZE * 0.74;
  return (
    <View accessibilityLabel={glyph} style={{ width: SIZE, height: SIZE, alignSelf: "center", borderWidth: 1, borderColor: "rgba(159,203,255,0.35)", backgroundColor: "rgba(5,10,24,0.85)", userSelect: "none", touchAction: "none" }}
      {...pan.panHandlers}>
      <Svg width={SIZE} height={SIZE} pointerEvents="none">
        {/* Guide lines, like squared writing paper */}
        <Path d={`M${SIZE / 2} 0 V${SIZE} M0 ${SIZE / 2} H${SIZE}`} stroke="rgba(159,203,255,0.12)" strokeDasharray="6 6" />
        {mode === "trace" || reveal ? (
          <SvgText x={SIZE / 2} y={SIZE / 2 + glyphSize * 0.36} fontSize={glyphSize} textAnchor="middle"
            fill={reveal ? color.accent : "#FFFFFF"} fillOpacity={reveal ? 0.45 : 0.16}>{glyph}</SvgText>
        ) : null}
        {[...strokes, ...(live ? [live] : [])].map((s, i) => (
          <Path key={i} d={toPath(s)} stroke="#FFFFFF" strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        ))}
      </Svg>
    </View>
  );
}
