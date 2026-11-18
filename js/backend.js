/* ============================================================
   BACKEND — one interface, swappable implementations.

   Voter side (vote.html)
     deviceId()                 stable id for this phone
     store                      Storage used for this device's local data
     join(nick)                 register / rename this phone
     onState(cb)                cb(state|null) whenever the session state changes
     vote(roundId, choice)      throws if voting for that round is not open

   Presenter side (index.html)
     setState(state)            publish what phones should show
     onVotes(cb)                cb([{roundId, choice, deviceId, nick, ts}])
     onPlayers(cb)              cb({deviceId: {nick, joinedAt}})
     reset()                    wipe the session (votes, players, state)
     simulate(roundId, n)       mock only: n fake phones vote

   The Firestore implementation will expose exactly the same methods.
   ============================================================ */
(function () {
  const CFG = window.SURAKSHA_CONFIG || { backend: "mock", sessionId: "ye2026" };
  const params = new URLSearchParams(location.search);
  const kind = params.get("backend") || CFG.backend || "mock";

  const rid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
  const sGet = (s, k) => { try { return s.getItem(k); } catch (e) { return null; } };
  const sSet = (s, k, v) => { try { s.setItem(k, v); } catch (e) {} };

  const FAKE_ADJ = ["Turbo", "Agentic", "Monsoon", "Masala", "Express", "Fearless", "Midnight", "Fast-Track", "Cutting", "Sharp"];
  const FAKE_NOUN = ["Vada Pav", "Dabbawala", "Local Train", "Sea Link", "Kaali-Peeli", "Pav Bhaji", "Marine Drive", "Bandra Bot", "Chai Wala", "Gateway"];

  /* ---------------- Mock: localStorage + BroadcastChannel ---------------- */
  class MockBackend {
    constructor(sid) {
      this.kind = "mock";
      this.sid = sid;
      this.key = "suraksha-mock-db-" + sid;
      // sessionStorage => every tab behaves like a separate phone
      this.store = window.sessionStorage;
      this.subs = new Set();
      this.ch = "BroadcastChannel" in window ? new BroadcastChannel(this.key) : null;
      if (this.ch) this.ch.onmessage = () => this._emit();
      window.addEventListener("storage", (e) => { if (e.key === this.key) this._emit(); });
    }
    async init() { this.requiresAuth = false; return true; }
    _empty() { return { state: null, votes: {}, players: {} }; }
    _db() { try { return JSON.parse(localStorage.getItem(this.key)) || this._empty(); } catch (e) { return this._empty(); } }
    _save(db) { sSet(localStorage, this.key, JSON.stringify(db)); if (this.ch) this.ch.postMessage(1); this._emit(); }
    _emit() { const db = this._db(); this.subs.forEach((f) => f(db)); }
    _sub(f) { this.subs.add(f); setTimeout(() => f(this._db()), 0); return () => this.subs.delete(f); }

    deviceId() {
      let id = sGet(this.store, "suraksha-device-" + this.sid);
      if (!id) { id = "d_" + rid(); sSet(this.store, "suraksha-device-" + this.sid, id); }
      return id;
    }
    async join(nick) {
      const db = this._db(), id = this.deviceId();
      db.players[id] = { nick, joinedAt: (db.players[id] || {}).joinedAt || Date.now() };
      Object.values(db.votes).forEach((v) => { if (v.deviceId === id) v.nick = nick; });
      this._save(db);
      return id;
    }
    onState(cb) { return this._sub((db) => cb(db.state)); }
    async vote(roundId, choice) {
      const db = this._db(), s = db.state, id = this.deviceId();
      if (!s || s.screen !== "round" || s.roundId !== roundId || s.phase !== "vote") throw new Error("closed");
      if (!["A", "B", "C", "D"].includes(choice)) throw new Error("bad choice");
      db.votes[roundId + "_" + id] = { roundId, choice, deviceId: id, nick: (db.players[id] || {}).nick || "", ts: Date.now() };
      this._save(db);
    }

    async setState(state) { const db = this._db(); db.state = Object.assign({}, state, { updatedAt: Date.now() }); this._save(db); }
    onVotes(cb) { return this._sub((db) => cb(Object.values(db.votes))); }
    onPlayers(cb) { return this._sub((db) => cb(db.players)); }
    async reset() { this._save(this._empty()); }

    async simulate(roundId, n = 40) {
      const db = this._db(), s = db.state;
      if (!s || s.roundId !== roundId || s.phase !== "vote") throw new Error("Open a vote first");
      const weights = [0.2, 0.35, 0.25, 0.2].map((w) => w + Math.random() * 0.3);
      const tot = weights.reduce((a, b) => a + b, 0);
      for (let i = 0; i < n; i++) {
        const id = "sim_" + i;
        if (!db.players[id]) db.players[id] = { nick: FAKE_ADJ[i % 10] + " " + FAKE_NOUN[Math.floor(i / 10) % 10], joinedAt: Date.now() };
        let r = Math.random() * tot, k = 0;
        while (r > weights[k]) { r -= weights[k]; k++; }
        db.votes[roundId + "_" + id] = { roundId, choice: "ABCD"[Math.min(k, 3)], deviceId: id, nick: db.players[id].nick, ts: Date.now() + Math.floor(Math.random() * 15000) };
      }
      this._save(db);
    }
  }

  /* ---------------- Firestore: next step ---------------- */
  class FirestoreBackend {
    constructor(sid) {
      this.kind = "firestore";
      this.sid = sid;
      this.store = window.localStorage;   // real phones: survive refreshes
      this.requiresAuth = true;           // presenter must sign in
      this.user = null;
      this.authSubs = new Set();
    }

    async init(role) {
      if (this.ready) return this.ready;
      this.ready = (async () => {
        if (!CFG.firebase || !CFG.firebase.projectId) throw new Error("Firebase config missing in js/config.js");
        const base = "https://www.gstatic.com/firebasejs/" + (CFG.firebaseSdk || "10.12.2") + "/";
        const appM = await import(base + "firebase-app.js");
        this.F = await import(base + "firebase-firestore.js");
        this.app = appM.initializeApp(CFG.firebase);
        // long-polling auto-detect helps on venue Wi-Fi / proxies that break streaming
        this.db = this.F.initializeFirestore(this.app, { experimentalAutoDetectLongPolling: true });
        if (role === "presenter") {
          this.A = await import(base + "firebase-auth.js");
          this.auth = this.A.getAuth(this.app);
          this.A.onAuthStateChanged(this.auth, (u) => { this.user = u; this.authSubs.forEach((f) => f(this.status())); });
        }
        return true;
      })();
      return this.ready;
    }

    /* ---------- presenter auth ---------- */
    status() {
      const u = this.user, want = (CFG.presenterEmail || "").toLowerCase();
      if (!u) return { signedIn: false, ok: false };
      const email = (u.email || "").toLowerCase();
      return { signedIn: true, email: u.email, ok: !want || email === want };
    }
    onAuth(cb) { this.authSubs.add(cb); cb(this.status()); return () => this.authSubs.delete(cb); }
    async signIn() { const p = new this.A.GoogleAuthProvider(); p.setCustomParameters({ prompt: "select_account" }); await this.A.signInWithPopup(this.auth, p); }
    async signOut() { await this.A.signOut(this.auth); }

    /* ---------- paths ---------- */
    _sess() { return this.F.doc(this.db, "sessions", this.sid); }
    _col(name) { return this.F.collection(this.db, "sessions", this.sid, name); }

    /* ---------- voter ---------- */
    deviceId() {
      let id = sGet(this.store, "suraksha-device-" + this.sid);
      if (!id || !/^d_[a-z0-9]{8,24}$/.test(id)) { id = "d_" + rid().replace(/[^a-z0-9]/g, "").padEnd(10, "0"); sSet(this.store, "suraksha-device-" + this.sid, id); }
      return id;
    }
    async join(nick) {
      const id = this.deviceId();
      await this.F.setDoc(this.F.doc(this._col("players"), id), { nick, joinedAt: this.F.serverTimestamp() });
      sSet(this.store, "suraksha-nick-" + this.sid, nick);
      return id;
    }
    onState(cb) {
      return this.F.onSnapshot(this._sess(), (snap) => cb(snap.exists() ? snap.data() : null), (err) => console.warn("state listener", err));
    }
    async vote(roundId, choice) {
      const id = this.deviceId(), nick = sGet(this.store, "suraksha-nick-" + this.sid) || "";
      try {
        await this.F.setDoc(this.F.doc(this._col("votes"), roundId + "_" + id), { roundId, choice, deviceId: id, nick, ts: this.F.serverTimestamp() });
      } catch (e) {
        if (e && e.code === "permission-denied") throw new Error("closed");
        throw e;
      }
    }

    /* ---------- presenter ---------- */
    async setState(state) {
      await this.F.setDoc(this._sess(), Object.assign({}, state, { updatedAt: this.F.serverTimestamp() }));
    }
    onVotes(cb) {
      return this.F.onSnapshot(this._col("votes"), (qs) => {
        cb(qs.docs.map((d) => { const x = d.data(); return { roundId: x.roundId, choice: x.choice, deviceId: x.deviceId, nick: x.nick, ts: x.ts && x.ts.toMillis ? x.ts.toMillis() : Date.now() }; }));
      }, (err) => console.warn("votes listener", err));
    }
    onPlayers(cb) {
      return this.F.onSnapshot(this._col("players"), (qs) => {
        const out = {}; qs.docs.forEach((d) => { const x = d.data(); out[d.id] = { nick: x.nick, joinedAt: x.joinedAt && x.joinedAt.toMillis ? x.joinedAt.toMillis() : Date.now() }; }); cb(out);
      }, (err) => console.warn("players listener", err));
    }
    async reset() {
      for (const name of ["votes", "players"]) {
        const qs = await this.F.getDocs(this._col(name));
        for (let i = 0; i < qs.docs.length; i += 400) {
          const b = this.F.writeBatch(this.db);
          qs.docs.slice(i, i + 400).forEach((d) => b.delete(d.ref));
          await b.commit();
        }
      }
      await this.F.setDoc(this._sess(), { screen: "lobby", updatedAt: this.F.serverTimestamp() });
    }
  }

  const sid = CFG.sessionId || "ye2026";
  window.SurakshaBackend = kind === "firestore" ? new FirestoreBackend(sid) : new MockBackend(sid);
})();
