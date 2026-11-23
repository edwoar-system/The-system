import { useState } from "react";
import { Platform, ScrollView, Text, View } from "react-native";
import * as Updates from "expo-updates";
import { signOut } from "firebase/auth";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { auth } from "../lib/firebase";
import { setPlayerName } from "../lib/player";
import { levelFromXp } from "../game/economy";
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

// Room 0: who you are, your coins, and proof that the save file syncs.
export default function Home({ user, player, error, synced }) {
  const theme = useTheme();
  const { color, font } = theme;
  const insets = useSafeAreaInsets();
  const [nameDraft, setNameDraft] = useState("");
  const lvl = levelFromXp(player?.xp ?? 0);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: color.bg }}
      contentContainerStyle={{ padding: 24, paddingTop: insets.top + 32, paddingBottom: 40,
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
                {t.home.level} {lvl.level}
              </Text>
              <Text style={{ fontFamily: font.display, fontSize: 14, color: color.muted, fontVariant: ["tabular-nums"] }}>
                {lvl.xpIntoLevel} / {lvl.xpForLevel} {t.home.xp}
              </Text>
            </View>
            <View style={{ height: 6, backgroundColor: color.line, borderRadius: 3, overflow: "hidden" }}>
              <View style={{ width: `${Math.max((lvl.xpIntoLevel / lvl.xpForLevel) * 100, 2)}%`, height: "100%", backgroundColor: color.accent, borderRadius: 3 }} />
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
