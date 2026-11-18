/* ============================================================
   CONFIG — the only file you edit to switch backends.
   backend: "mock"      → no server; tabs in the same browser sync
                          with each other (for building & rehearsing UI)
            "firestore" → live mode (wired up in the next step)
   You can also force a backend per page with ?backend=mock
   ============================================================ */
window.SURAKSHA_CONFIG = {
  backend: "mock",
  sessionId: "ye2026",

  // Filled in during the Firestore step:
  firebase: null,          // { apiKey, authDomain, projectId, appId }
  presenterEmail: "uiparth06@gmail.com"       // the Gmail allowed to control the session
};
