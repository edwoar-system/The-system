// thesystem://do/<action>: queues the action (lib/links.js) and goes to the app.
import { useEffect } from "react";
import { View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { queueLink } from "../../lib/links";

export default function DoAction() {
  const { action, ...params } = useLocalSearchParams();
  useEffect(() => {
    queueLink(action, params);
    router.replace("/");
    // Run once for this link.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return <View style={{ flex: 1, backgroundColor: "#01040A" }} />;
}
