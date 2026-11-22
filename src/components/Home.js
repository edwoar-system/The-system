import { Platform, ScrollView, Text, View } from "react-native";
import { signOut } from "firebase/auth";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { auth } from "../lib/firebase";
import { addCoins, usePlayer } from "../lib/player";
import { Button, Window } from "./ui";
import { C } from "../theme";
import { t } from "../i18n";

// Room 0: login + one live-synced number. Change it on one device, watch it change on the other.
export default function Home({ user }) {
  const insets = useSafeAreaInsets();
  const { player, error, synced } = usePlayer(user.uid);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }}
      contentContainerStyle={{ padding: 20, paddingTop: insets.top + 20, gap: 16, maxWidth: 520, width: "100%", alignSelf: "center" }}>
      <Text style={{ color: C.text, fontSize: 22, fontWeight: "800", letterSpacing: 5 }}>{t.appName}</Text>
      <Text style={{ color: C.muted }}>{t.home.player}: {user.email} · {Platform.OS === "web" ? t.home.web : t.home.app}</Text>

      <Window title={t.home.coins}>
        {error ? (
          <Text style={{ color: C.danger }}>{t.home.dbError}: {error}</Text>
        ) : !player ? (
          <Text style={{ color: C.muted }}>{t.home.loading}</Text>
        ) : (
          <>
            <Text testID="coins" style={{ color: C.gold, fontSize: 56, fontWeight: "800" }}>{player.coins}</Text>
            <Text style={{ color: synced ? C.ok : C.muted, fontSize: 13 }}>
              {synced ? t.home.saved : t.home.saving}
            </Text>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <View style={{ flex: 1 }}><Button testID="plus" label="+1" onPress={() => addCoins(user.uid, 1)} /></View>
              <View style={{ flex: 1 }}><Button testID="plus10" label="+10" onPress={() => addCoins(user.uid, 10)} /></View>
              <View style={{ flex: 1 }}><Button kind="ghost" label="−1" onPress={() => addCoins(user.uid, -1)} /></View>
            </View>
          </>
        )}
      </Window>

      <Window title={t.home.testTitle}>
        <Text style={{ color: C.text, lineHeight: 22 }}>{t.home.testText}</Text>
      </Window>

      <Button kind="ghost" label={t.home.logout} onPress={() => signOut(auth)} />
    </ScrollView>
  );
}
