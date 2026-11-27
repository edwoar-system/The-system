// The home-screen and lock-screen widget (WidgetKit, built by @bacons/apple-targets).
// The app writes a small summary to the shared App Group (src/lib/widget.js); the widget only reads it.
/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = (config) => ({
  type: "widget",
  name: "TheSystemWidget",
  displayName: "The System",
  bundleIdentifier: ".widget",
  deploymentTarget: "17.0",
  entitlements: {
    "com.apple.security.application-groups": config.ios.entitlements["com.apple.security.application-groups"],
  },
  colors: {
    $widgetBackground: "#01040A",
    $accent: "#9FCBFF",
  },
});
