import { useState } from "react";
import { KeyboardAvoidingView, Platform, Text, View } from "react-native";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../lib/firebase";
import { Button, Field, Window } from "./ui";
import { C } from "../theme";
import { t } from "../i18n";

export default function Login() {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!email.trim() || !password) return setError(t.login.empty);
    setBusy(true);
    setError("");
    try {
      const fn = mode === "login" ? signInWithEmailAndPassword : createUserWithEmailAndPassword;
      await fn(auth, email.trim(), password);
    } catch (e) {
      setError(t.errors[e.code] ?? e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={{ flex: 1, backgroundColor: C.bg, justifyContent: "center", padding: 24 }}>
      <View style={{ width: "100%", maxWidth: 420, alignSelf: "center" }}>
        <Text style={{ color: C.text, fontSize: 28, fontWeight: "800", letterSpacing: 6, textAlign: "center", marginBottom: 24 }}>
          {t.appName}
        </Text>
        <Window title={mode === "login" ? t.login.title : t.login.signupTitle}>
          <Field testID="email" placeholder={t.login.email} keyboardType="email-address" value={email}
            onChangeText={(t) => { setEmail(t); setError(""); }} />
          <Field testID="password" placeholder={t.login.password} secureTextEntry value={password}
            onChangeText={(t) => { setPassword(t); setError(""); }} onSubmitEditing={submit} />
          {error ? <Text style={{ color: C.danger, fontSize: 13 }}>{error}</Text> : null}
          <Button testID="submit" label={busy ? t.login.busy : mode === "login" ? t.login.submit : t.login.signup}
            onPress={submit} disabled={busy} />
          <Button kind="ghost" label={mode === "login" ? t.login.toSignup : t.login.toLogin}
            onPress={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); }} />
        </Window>
      </View>
    </KeyboardAvoidingView>
  );
}
