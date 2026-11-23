import { useState } from "react";
import { Platform, ScrollView, Text, View } from "react-native";
import * as Updates from "expo-updates";
import { signOut } from "firebase/auth";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { auth } from "../lib/firebase";
import { addCoins, setPlayerName, usePlayer } from "../lib/player";
import { Button, Field, Panel, glow } from "./ui";
import { useTheme } from "../theme";
import { t } from "../i18n";

function greeting() {
  const h = new Date().getHours();
  if (h < 5) return t.home.night;
  if (h < 12) return t.home.morning;
  if (h < 18) return t.home.afternoon;
  return t.home.evening;
}

const XP_PER_LEVEL = 100; // placeholder until the economy (room 2) is designed

// Room 0: who you are, your coins, and proof that the save file syncs.
export default function Home({ user }) {
  const theme = useTheme();
  const { color, font } = theme;
  const insets = useSafeAreaInsets();
  const { player, error, synced } = usePlayer(user.uid);
  const [nameDraft, setNameDraft] = useState("");
  const xp = (player?.xp ?? 0) % XP_PER_LEVEL;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: color.bg }}
      contentContainerStyle={{ padding: 24, paddingTop: insets.top + 32, paddingBottom: insets.bottom + 32,
        gap: 24, maxWidth: 480, width: "100%", alignSelf: "center" }}>

      <View style={{ gap: 4 }}>
        <Text style={{ fontFamily: font.body, fontSize: 17, color: color.muted }}>{greeting()}</Text>
        <Text testID="player-name" style={{ fontFamily: font.displayHeavy, fontSize: 38, lineHeight: 44, color: color.text, letterSpacing: 0.5 }}>
          {player?.name || t.home.defaultName}
        </Text>
        {player ? (
          <View style={{ gap: 8, marginTop: 10 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ fontFamily: font.display, fontSize: 16, color: color.accent }}>
                {t.home.level} {player.level ?? 1}
              </Text>
              <Text style={{ fontFamily: font.display, fontSize: 14, color: color.muted, fontVariant: ["tabular-nums"] }}>
                {xp} / {XP_PER_LEVEL} {t.home.xp}
              </Text>
            </View>
            <View style={{ height: 6, backgroundColor: color.line, borderRadius: 3, overflow: "hidden" }}>
              <View style={{ width: `${Math.max(xp, 2)}%`, height: "100%", backgroundColor: color.accent, borderRadius: 3 }} />
            </View>
          </View>
        ) : null}
      </View>

      {error ? (
        <Text style={{ fontFamily: font.bodyMedium, color: color.danger }}>{t.home.dbError} ({error})</Text>
      ) : !player ? (
        <Text style={{ fontFamily: font.body, color: color.muted }}>{t.home.loading}</Text>
      ) : (
        <>
          {!player.name ? (
            <Panel title={t.home.setName}>
              <Field label={t.login.name} value={nameDraft} onChangeText={setNameDraft} autoCapitalize="words" />
              <Button label={t.home.saveName} disabled={!nameDraft.trim()}
                onPress={() => setPlayerName(user.uid, nameDraft.trim())} />
            </Panel>
          ) : null}

          <Panel title={t.home.coinsTitle}>
            <Text testID="coins" style={{ fontFamily: font.displayHeavy, fontSize: 76, lineHeight: 84, color: color.reward,
              fontVariant: ["tabular-nums"], ...glow(theme, "rgba(245,201,106,0.45)") }}>
              {player.coins}
            </Text>
            <Text style={{ fontFamily: font.body, fontSize: 15, color: color.muted }}>{t.home.coinsHint}</Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 }}>
              <View style={{ width: 7, height: 7, backgroundColor: synced ? color.accent : color.muted }} />
              <Text style={{ fontFamily: font.bodyMedium, fontSize: 14, color: synced ? color.accent : color.muted }}>
                {synced ? t.home.synced : t.home.syncing}
              </Text>
            </View>
          </Panel>

          <Panel title={t.home.testTitle}>
            <Text style={{ fontFamily: font.body, fontSize: 15, lineHeight: 22, color: color.muted }}>{t.home.testText}</Text>
            <View style={{ flexDirection: "row", gap: 10, marginTop: 4 }}>
              <Button testID="plus" label="+1" style={{ flex: 1 }} onPress={() => addCoins(user.uid, 1)} />
              <Button testID="plus10" label="+10" style={{ flex: 1 }} onPress={() => addCoins(user.uid, 10)} />
              <Button kind="secondary" label="−1" style={{ flex: 1 }} onPress={() => addCoins(user.uid, -1)} />
            </View>
          </Panel>
        </>
      )}

      {Platform.OS !== "web" ? (
        <Text style={{ fontFamily: font.body, fontSize: 13, color: color.muted }}>
          {Updates.isEmbeddedLaunch ? t.home.builtIn : t.home.overTheAir}
        </Text>
      ) : null}

      <Button kind="text" label={t.home.logout} onPress={() => signOut(auth)} style={{ alignSelf: "flex-start", paddingHorizontal: 0 }} />
    </ScrollView>
  );
}
