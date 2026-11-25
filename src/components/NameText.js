// A player's name with their name effect from the shop (glow, shadow, frost, flame). Friends see it too.
import { Text } from "react-native";
import { NAME_EFFECTS } from "../game/shop";

export default function NameText({ effect, style, children, ...rest }) {
  const e = NAME_EFFECTS[effect];
  const fx = e?.shadow ? { textShadowColor: e.shadow, textShadowRadius: e.radius, textShadowOffset: { width: 0, height: 0 }, ...(e.color ? { color: e.color } : {}) } : null;
  return <Text {...rest} style={[style, fx]}>{children}</Text>;
}
