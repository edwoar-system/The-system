import { ActivityIndicator, View } from "react-native";
import { useAuthUser } from "../lib/player";
import Login from "../components/Login";
import Home from "../components/Home";
import { C } from "../theme";

export default function Index() {
  const user = useAuthUser();
  if (user === undefined) {
    return (
      <View style={{ flex: 1, backgroundColor: C.bg, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={C.accent} />
      </View>
    );
  }
  return user ? <Home user={user} /> : <Login />;
}
