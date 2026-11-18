/* ============================================================
   CONFIG — the only file you edit to switch backends.
   backend: "firestore" → live mode (real phones)
            "mock"      → no server; tabs in the same browser sync
                          with each other (for building & rehearsing UI)
   Override per page with ?backend=mock  e.g. index.html?backend=mock
   ============================================================ */
window.SURAKSHA_CONFIG = {
  backend: "firestore",
  sessionId: "ye2026",

  // Public web config: safe to commit. Access is controlled by firestore.rules.
  firebase: {
    apiKey: "AIzaSyBb6HaN0GtAvuixwlTGKa-0RnTjM39ukPQ",
    authDomain: "suraksha-f8d85.firebaseapp.com",
    projectId: "suraksha-f8d85",
    storageBucket: "suraksha-f8d85.firebasestorage.app",
    messagingSenderId: "558016227281",
    appId: "1:558016227281:web:f3e8358a169750c3aa22f0"
  },
  firebaseSdk: "10.12.2",

  // The Gmail allowed to control the session. Must match firestore.rules.
  presenterEmail: "uiparth06@gmail.com"
};
