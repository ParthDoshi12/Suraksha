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
    async init() { return true; }
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
    constructor(sid) { this.kind = "firestore"; this.sid = sid; this.store = window.localStorage; }
    async init() { throw new Error("Firestore backend not wired up yet — set backend: \"mock\" in js/config.js"); }
  }

  const sid = CFG.sessionId || "ye2026";
  window.SurakshaBackend = kind === "firestore" ? new FirestoreBackend(sid) : new MockBackend(sid);
})();
