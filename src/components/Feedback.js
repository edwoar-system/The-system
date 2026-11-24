// The lightbulb: send Edward a tip, an idea or a problem from anywhere it appears.
import { useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, Text, TextInput, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { FEEDBACK_KINDS, FEEDBACK_MAX, sendFeedback } from "../lib/feedback";
import { doneFeel } from "../lib/haptics";
import { Frame, Label, SysButton } from "./sys";
import { useTheme } from "../theme";
import { t } from "../i18n";

export function BulbIcon({ size = 22, c }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.7.6 1.1 1.3 1.1 2.2h5c0-.9.4-1.6 1.1-2.2A6 6 0 0 0 12 3z" stroke={c} strokeWidth={1.6} fill="none" strokeLinejoin="round" strokeLinecap="round" />
    </Svg>
  );
}

export function FeedbackSheet({ user, player, onClose }) {
  const { color, font } = useTheme();
  const [kind, setKind] = useState("idea");
  const [text, setText] = useState("");
  const [state, setState] = useState(null); // null | "sending" | "sent" | "failed"
  async function send() {
    setState("sending");
    try {
      await sendFeedback(user.uid, player?.name, kind, text);
      doneFeel();
      setState("sent");
    } catch { setState("failed"); }
  }
  return (
    <Modal transparent animationType="fade" visible onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <Pressable accessibilityLabel={t.feedback.close} onPress={onClose} style={{ flex: 1, backgroundColor: "rgba(1,4,10,0.9)", justifyContent: "center", padding: 18 }}>
          <Pressable onPress={() => {}} style={{ width: "100%", maxWidth: 420, alignSelf: "center" }}>
            <Frame kind="premium" cut={16} contentStyle={{ padding: 18, gap: 14 }}>
              {state === "sent" ? (
                <View style={{ alignItems: "center", gap: 10, paddingVertical: 10 }}>
                  <BulbIcon size={40} c={color.hi} />
                  <Text style={{ fontFamily: font.bold, fontSize: 20, color: "#FFFFFF" }}>{t.feedback.sentTitle}</Text>
                  <Text style={{ textAlign: "center", fontFamily: font.body, fontSize: 14, lineHeight: 20, color: color.muted }}>{t.feedback.sentText}</Text>
                  <SysButton label={t.feedback.done} onPress={onClose} style={{ alignSelf: "stretch", marginTop: 6 }} />
                </View>
              ) : (
                <>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <BulbIcon size={24} c={color.hi} />
                    <Label tone={color.hi}>{t.feedback.title}</Label>
                  </View>
                  <Text style={{ fontFamily: font.body, fontSize: 14, lineHeight: 20, color: color.text }}>{t.feedback.intro}</Text>
                  <View style={{ flexDirection: "row", gap: 6 }}>
                    {FEEDBACK_KINDS.map((k) => {
                      const on = kind === k;
                      return (
                        <Pressable key={k} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => setKind(k)}
                          style={{ flex: 1, minHeight: 44, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: on ? color.frame : "rgba(159,203,255,0.22)", backgroundColor: on ? "rgba(159,203,255,0.16)" : "transparent" }}>
                          <Text style={{ fontFamily: font.bold, fontSize: 13, color: on ? "#FFFFFF" : color.muted }}>{t.feedback.kinds[k]}</Text>
                        </Pressable>
                      );
                    })}
                  </View>
                  <TextInput value={text} onChangeText={setText} multiline maxLength={FEEDBACK_MAX} accessibilityLabel={t.feedback.placeholder[kind]}
                    placeholder={t.feedback.placeholder[kind]} placeholderTextColor="#4A5A7A" textAlignVertical="top"
                    style={{ minHeight: 120, maxHeight: 220, padding: 12, fontFamily: font.body, fontSize: 15, lineHeight: 21, color: "#FFFFFF", borderWidth: 1, borderColor: "rgba(159,203,255,0.3)", backgroundColor: "rgba(5,10,24,0.7)" }} />
                  {state === "failed" ? <Text style={{ fontFamily: font.body, fontSize: 13, color: "#F6B45A" }}>{t.feedback.failed}</Text> : null}
                  <SysButton label={state === "sending" ? t.feedback.sending : t.feedback.send} disabled={state === "sending" || text.trim().length < 3} onPress={send} />
                  <Pressable accessibilityRole="button" onPress={onClose} style={{ minHeight: 40, alignItems: "center", justifyContent: "center" }}>
                    <Text style={{ fontFamily: font.bodyBold, fontSize: 14, color: color.muted }}>{t.feedback.cancel}</Text>
                  </Pressable>
                </>
              )}
            </Frame>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// The lightbulb button for a screen's header.
export function FeedbackButton({ user, player }) {
  const { color } = useTheme();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Pressable accessibilityRole="button" accessibilityLabel={t.feedback.button} hitSlop={8} onPress={() => setOpen(true)}
        style={({ pressed }) => ({ width: 44, height: 44, alignItems: "center", justifyContent: "center", opacity: pressed ? 0.6 : 1 })}>
        <BulbIcon c={color.muted} />
      </Pressable>
      {open ? <FeedbackSheet user={user} player={player} onClose={() => setOpen(false)} /> : null}
    </>
  );
}
