import { ActivityIndicator, View } from "react-native";
import { useAuthUser } from "../lib/player";
import Login from "../components/Login";
import Shell from "../components/Shell";
import { useTheme } from "../theme";

export default function Index() {
  const user = useAuthUser();
  const { color } = useTheme();
  if (user === undefined) {
    return (
      <View style={{ flex: 1, backgroundColor: color.bg, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={color.muted} />
      </View>
    );
  }
  return user ? <Shell user={user} /> : <Login />;
}
