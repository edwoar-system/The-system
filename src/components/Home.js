import { useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { signOut } from "firebase/auth";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { auth } from "../lib/firebase";
import { addCoins, setPlayerName, usePlayer } from "../lib/player";
import { Button, Field } from "./ui";
import { useTheme } from "../theme";
import { t } from "../i18n";

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return t.home.night;
  if (h < 12) return t.home.morning;
  if (h < 18) return t.home.afternoon;
  return t.home.evening;
}

// Room 0: who you are, your coins, and proof that the save file syncs.
export default function Home({ user }) {
  const theme = useTheme();
  const { color, font, radius } = theme;
  const insets = useSafeAreaInsets();
  const { player, error, synced } = usePlayer(user.uid);
  const [nameDraft, setNameDraft] = useState("");

  return (
    <ScrollView style={{ flex: 1, backgroundColor: color.bg }}
      contentContainerStyle={{ padding: 24, paddingTop: insets.top + 32, paddingBottom: insets.bottom + 32,
        gap: 28, maxWidth: 480, width: "100%", alignSelf: "center" }}>

      <View style={{ gap: 4 }}>
        <Text style={{ fontFamily: font.body, fontSize: 17, color: color.muted }}>{greeting()}</Text>
        <Text testID="player-name" style={{ fontFamily: font.displayHeavy, fontSize: 34, lineHeight: 40, color: color.text, letterSpacing: -0.5 }}>
          {player?.name || t.home.defaultName}
        </Text>
        {player ? (
          <Text style={{ fontFamily: font.bodyMedium, fontSize: 15, color: color.muted, marginTop: 4 }}>
            {t.home.level} {player.level ?? 1}
          </Text>
        ) : null}
      </View>

      {error ? (
        <Text style={{ fontFamily: font.bodyMedium, color: color.danger }}>{t.home.dbError} ({error})</Text>
      ) : !player ? (
        <Text style={{ fontFamily: font.body, color: color.muted }}>{t.home.loading}</Text>
      ) : (
        <>
          {!player.name ? (
            <View style={{ gap: 12 }}>
              <Field label={t.home.setName} value={nameDraft} onChangeText={setNameDraft} autoCapitalize="words" />
              <Button kind="secondary" label={t.home.saveName} disabled={!nameDraft.trim()}
                onPress={() => setPlayerName(user.uid, nameDraft.trim())} />
            </View>
          ) : null}

          <View style={{ backgroundColor: color.surface, borderRadius: radius.card, padding: 24, gap: 6 }}>
            <View style={{ flexDirection: "row", alignItems: "baseline", gap: 10 }}>
              <Text testID="coins" style={{ fontFamily: font.displayHeavy, fontSize: 72, lineHeight: 80, color: color.text,
                letterSpacing: -2, fontVariant: ["tabular-nums"] }}>
                {player.coins}
              </Text>
              <Text style={{ fontFamily: font.display, fontSize: 18, color: color.muted }}>{t.home.coins}</Text>
            </View>
            <Text style={{ fontFamily: font.body, fontSize: 15, color: color.muted }}>{t.home.coinsHint}</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 14 }}>
              <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: synced ? color.accent : color.muted }} />
              <Text style={{ fontFamily: font.bodyMedium, fontSize: 14, color: synced ? color.accent : color.muted }}>
                {synced ? t.home.synced : t.home.syncing}
              </Text>
            </View>
          </View>

          <View style={{ gap: 12 }}>
            <Text style={{ fontFamily: font.display, fontSize: 16, color: color.text }}>{t.home.testTitle}</Text>
            <Text style={{ fontFamily: font.body, fontSize: 15, lineHeight: 22, color: color.muted }}>{t.home.testText}</Text>
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Button testID="plus" label="+1" style={{ flex: 1 }} onPress={() => addCoins(user.uid, 1)} />
              <Button testID="plus10" label="+10" style={{ flex: 1 }} onPress={() => addCoins(user.uid, 10)} />
              <Button kind="secondary" label="−1" style={{ flex: 1 }} onPress={() => addCoins(user.uid, -1)} />
            </View>
          </View>
        </>
      )}

      <Button kind="text" label={t.home.logout} onPress={() => signOut(auth)} style={{ alignSelf: "flex-start", paddingHorizontal: 0 }} />
    </ScrollView>
  );
}
