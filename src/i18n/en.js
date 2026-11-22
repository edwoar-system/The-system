export default {
  appName: "THE SYSTEM",
  login: { title: "[ LOGIN ]", signupTitle: "[ NEW PLAYER ]", email: "Email", password: "Password",
    submit: "Log in", signup: "Create account", busy: "Working...",
    toSignup: "No account yet? Create one", toLogin: "Already a player? Log in",
    empty: "Enter your email and password." },
  errors: {
    "auth/invalid-email": "That email address doesn't look right.",
    "auth/invalid-credential": "Email or password is incorrect.",
    "auth/email-already-in-use": "This email already has an account. Log in instead.",
    "auth/weak-password": "Password needs at least 6 characters.",
    "auth/network-request-failed": "No connection. Try again.",
  },
  home: { player: "Player", web: "website", app: "iPhone app", coins: "[ COINS ]", loading: "Loading...",
    dbError: "Database error", saved: "● Saved to the database", saving: "○ Saving...",
    testTitle: "[ ROOM 0 TEST ]",
    testText: "Open this on a second device and log in with the same account. Tap +1 here: the number there should change within a few seconds.",
    logout: "Log out" },
};
