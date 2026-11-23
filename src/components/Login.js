import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../lib/firebase";
import { createPlayer } from "../lib/player";
import { Button, Field } from "./ui";
import { useTheme } from "../theme";
import { t } from "../i18n";

export default function Login() {
  const { color, font } = useTheme();
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const signup = mode === "signup";

  async function submit() {
    if (signup && !name.trim()) return setError(t.login.emptyName);
    if (!email.trim() || !password) return setError(t.login.empty);
    setBusy(true);
    setError("");
    try {
      if (signup) {
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        await createPlayer(cred.user.uid, name.trim());
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      }
    } catch (e) {
      setError(t.errors[e.code] ?? e.message);
      setBusy(false);
    }
  }

  const clear = (fn) => (v) => { fn(v); setError(""); };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, backgroundColor: color.bg }}>
      <ScrollView keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: 28 }}>
        <View style={{ width: "100%", maxWidth: 400, alignSelf: "center", gap: 40 }}>
          <View style={{ gap: 12 }}>
            <Text style={{ fontFamily: font.displayHeavy, fontSize: 40, lineHeight: 44, color: color.text, letterSpacing: -1 }}>
              {t.appName}
            </Text>
            <Text style={{ fontFamily: font.body, fontSize: 17, color: color.muted }}>{t.tagline}</Text>
          </View>

          <View style={{ gap: 18 }}>
            <Text style={{ fontFamily: font.display, fontSize: 18, color: color.text }}>
              {signup ? t.login.signupTitle : t.login.loginTitle}
            </Text>
            {signup ? (
              <Field testID="name" label={t.login.name} placeholder={t.login.namePlaceholder}
                autoCapitalize="words" value={name} onChangeText={clear(setName)} />
            ) : null}
            <Field testID="email" label={t.login.email} keyboardType="email-address" autoComplete="email"
              value={email} onChangeText={clear(setEmail)} />
            <Field testID="password" label={t.login.password} secureTextEntry
              autoComplete={signup ? "new-password" : "current-password"}
              value={password} onChangeText={clear(setPassword)} onSubmitEditing={submit} />
            {error ? (
              <Text accessibilityRole="alert" style={{ fontFamily: font.bodyMedium, fontSize: 14, color: color.danger }}>{error}</Text>
            ) : null}
            <Button testID="submit" label={busy ? t.login.busy : signup ? t.login.signup : t.login.submit}
              onPress={submit} disabled={busy} style={{ marginTop: 6 }} />
            <Button kind="text" label={signup ? t.login.toLogin : t.login.toSignup}
              onPress={() => { setMode(signup ? "login" : "signup"); setError(""); }} />
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
