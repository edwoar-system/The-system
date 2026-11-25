// A safety net: when a screen breaks, the app shows what went wrong (and sends it to Edward as a "problem")
// instead of closing. "Try again" redraws the screen.
import { Component } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { sendFeedback } from "../lib/feedback";
import { t } from "../i18n";

export default class ErrorCatcher extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    const where = (info?.componentStack ?? "").split("\n").map((l) => l.trim()).filter(Boolean).slice(0, 6).join(" < ");
    sendFeedback(this.props.uid ?? null, this.props.name ?? null, "problem", `[crash] ${this.props.place ?? "app"}: ${error?.message ?? error} | ${where}`).catch(() => {});
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <View style={{ flex: 1, backgroundColor: "#01040A", justifyContent: "center", padding: 24 }}>
        <ScrollView contentContainerStyle={{ gap: 12, flexGrow: 1, justifyContent: "center" }}>
          <Text style={{ fontSize: 11, letterSpacing: 3, color: "#F6B45A", textAlign: "center", fontWeight: "700" }}>{t.crash.kicker}</Text>
          <Text style={{ fontSize: 20, color: "#FFFFFF", textAlign: "center", fontWeight: "700" }}>{t.crash.title}</Text>
          <Text style={{ fontSize: 14, lineHeight: 20, color: "#CAD6EC", textAlign: "center" }}>{t.crash.body}</Text>
          <Text selectable style={{ fontSize: 12, lineHeight: 17, color: "#8EA2C4", textAlign: "center" }}>{String(this.state.error?.message ?? this.state.error)}</Text>
          <Pressable accessibilityRole="button" onPress={() => this.setState({ error: null })}
            style={{ alignSelf: "center", minHeight: 48, paddingHorizontal: 24, justifyContent: "center", borderWidth: 1, borderColor: "#9FCBFF", marginTop: 8 }}>
            <Text style={{ fontSize: 14, color: "#FFFFFF", fontWeight: "700", letterSpacing: 1.5 }}>{t.crash.retry}</Text>
          </Pressable>
        </ScrollView>
      </View>
    );
  }
}
