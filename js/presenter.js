/* ============================================================
   PRESENTER ENGINE — drives the projector and publishes state
   that the phones (vote.html) render.
   ============================================================ */
(function () {
  const { ROUNDS, LAYERS, LENS, NOTES, EVENT } = window.SURAKSHA;
  const BE = window.SurakshaBackend;

  const SCREENS = [{ t: "title" }, { t: "org" }, { t: "lens" }, ...ROUNDS.map((r, i) => ({ t: "round", i })), { t: "map" }, { t: "leaders" }, { t: "close" }];
  const ROUND0 = 3;
  const PH = ["scene", "vote", "reveal", "twist", "twistAns"];
  const PH_DEMO = ["scene", "vote", "reveal", "demo", "twist", "twistAns"];
  const phs = (r) => (r && r.demo ? PH_DEMO : PH);
  const KEYS = ["A", "B", "C", "D"];
  const LSK = "suraksha-presenter-v2-" + BE.sid;
  const JOIN_URL = new URL("vote.html", location.href).href.replace(/\?.*$/, "");

  let st = { s: 0, p: 0, manual: {}, openedAt: {}, elapsed: 0, running: false, live: true, epoch: Date.now() };
  try { const sv = JSON.parse(localStorage.getItem(LSK) || "null"); if (sv) Object.assign(st, sv, { running: false }); } catch (e) {}
  const save = () => { try { localStorage.setItem(LSK, JSON.stringify({ s: st.s, p: st.p, manual: st.manual, openedAt: st.openedAt, elapsed: st.elapsed, live: st.live, epoch: st.epoch })); } catch (e) {} };

  let beOk = false, allVotes = [], players = {}, authState = null, unsubs = [], initFailed = false;

  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const strip = (s) => String(s).replace(/<[^>]+>/g, "");
  const cur = () => SCREENS[st.s];
  const roundOf = () => (cur().t === "round" ? ROUNDS[cur().i] : null);
  const isLive = () => st.live && beOk;
  const curPH = () => phs(roundOf())[st.p];

  /* ---------- votes ---------- */
  function liveCounts(rid) { const c = { A: 0, B: 0, C: 0, D: 0 }; allVotes.forEach((v) => { if (v.roundId === rid && c[v.choice] !== undefined) c[v.choice]++; }); return c; }
  function manual(rid) { return st.manual[rid] || (st.manual[rid] = { A: 0, B: 0, C: 0, D: 0 }); }
  function v(rid) { return isLive() ? liveCounts(rid) : manual(rid); }
  function majority(rid) { const x = v(rid); const tot = KEYS.reduce((a, k) => a + x[k], 0); if (!tot) return null; return KEYS.reduce((a, k) => (x[k] > x[a] ? k : a), "A"); }
  function revealedIdx() { const out = []; ROUNDS.forEach((r, i) => { const si = ROUND0 + i; if (st.s > si || (st.s === si && st.p >= 2)) out.push(i); }); return out; }

  function leaderboard() {
    const rev = revealedIdx(), by = {};
    Object.entries(players).forEach(([id, p]) => (by[id] = { id, nick: p.nick || "Guest", score: 0, time: 0, n: 0 }));
    allVotes.forEach((vt) => {
      const ri = ROUNDS.findIndex((r) => r.id === vt.roundId);
      if (ri < 0 || !rev.includes(ri)) return;
      const r = ROUNDS[ri];
      const p = by[vt.deviceId] || (by[vt.deviceId] = { id: vt.deviceId, nick: vt.nick || "Guest", score: 0, time: 0, n: 0 });
      p.n++;
      if (vt.choice === r.correct) { p.score++; p.time += Math.max(0, vt.ts - (st.openedAt[r.id] || vt.ts)); }
    });
    const arr = Object.values(by).filter((p) => p.n > 0).sort((a, b) => b.score - a.score || a.time - b.time);
    arr.forEach((p, i) => (p.rank = i + 1));
    return arr;
  }

  /* ---------- state published to phones ---------- */
  function stateFor() { return Object.assign(stateCore(), { epoch: st.epoch }); }
  function stateCore() {
    const sc = cur();
    if (sc.t === "round") {
      const r = ROUNDS[sc.i], ph = curPH(), phase = ph === "twistAns" ? "twist" : ph === "demo" ? "reveal" : ph;
      const s = {
        screen: "round", roundIdx: sc.i, roundId: r.id, total: ROUNDS.length, stage: r.stage, title: r.title,
        question: strip(r.question), phase,
        options: KEYS.reduce((o, k) => ((o[k] = { l: r.options[k].l, s: r.options[k].s }), o), {})
      };
      if (phase === "vote") { s.voteSecs = VOTE_SECS; s.voteEndsAt = (st.openedAt[r.id] || Date.now()) + VOTE_SECS * 1000; }
      if (phase === "reveal" || phase === "twist") { s.correct = r.correct; s.correctLabel = r.options[r.correct].l; }
      return s;
    }
    if (sc.t === "map" || sc.t === "leaders" || sc.t === "close")
      return { screen: "finale", total: ROUNDS.length, players: Object.keys(players).length, leaderboard: leaderboard().map((p) => ({ id: p.id, nick: p.nick, score: p.score, rank: p.rank })) };
    return { screen: "lobby" };
  }
  let lastPub = "";
  function publish() {
    if (!beOk) return;
    const s = stateFor(), j = JSON.stringify(s);
    if (j === lastPub) return;
    lastPub = j;
    BE.setState(s).catch((e) => toast("Could not publish state: " + e.message));
  }

  /* ---------- navigation ---------- */
  function next() { const sc = cur(); if (sc.t === "round" && st.p < phs(ROUNDS[sc.i]).length - 1) st.p++; else if (st.s < SCREENS.length - 1) { st.s++; st.p = 0; } render(); }
  function prev() { const sc = cur(); if (sc.t === "round" && st.p > 0) st.p--; else if (st.s > 0) { st.s--; const pv = SCREENS[st.s]; st.p = pv.t === "round" ? phs(ROUNDS[pv.i]).length - 1 : 0; } render(); }
  function go(s) { st.s = s; st.p = 0; render(); }
  function addVote(k, d) {
    const r = roundOf(); if (!r) return;
    if (isLive()) { toast("Live mode — counts come from phones. Press L for manual card counting."); return; }
    const x = manual(r.id); x[k] = Math.max(0, x[k] + d); if (st.p < 1) st.p = 1; render();
  }

  let toastT;
  function toast(msg) { const t = $("#toast"); t.textContent = msg; t.classList.add("on"); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove("on"), 2600); }

  /* ---------- views ---------- */
  function journey() {
    const pills = [["Start", 0], ...ROUNDS.map((r, i) => [r.stage, ROUND0 + i]), ["Your map", ROUND0 + ROUNDS.length]];
    $("#journey").innerHTML = pills.map(([n, si]) => {
      const now = st.s === si || (si === 0 && st.s < ROUND0) || (si === ROUND0 + ROUNDS.length && st.s > si);
      const done = !now && st.s > si && !(si === 0 && st.s < ROUND0);
      return `<div class="pill ${now ? "now" : done ? "done" : ""}" data-go="${si}">${n}</div>`;
    }).join("");
    const rev = revealedIdx();
    const right = rev.filter((i) => majority(ROUNDS[i].id) === ROUNDS[i].correct).length;
    const voted = rev.filter((i) => majority(ROUNDS[i].id) !== null).length;
    $("#score").textContent = `Room: ${right}/${voted}`;
    $("#joined").textContent = `📱 ${Object.keys(players).length}`;
    $("#mode").innerHTML = isLive() ? `<span class="live">● LIVE</span>`
      : beOk ? `<span class="man">MANUAL</span>`
      : authState && authState.signedIn && !authState.ok ? `<span class="signin" title="${esc(authState.email)} is not the presenter account">⚠ Wrong account · switch</span>`
      : BE.requiresAuth && BE.ready && !initFailed ? `<span class="signin">🔐 Sign in to go live</span>`
      : `<span class="man" title="Backend not connected">OFFLINE · MANUAL</span>`;
    const pcs = [];
    rev.forEach((i) => ROUNDS[i].pieces.forEach((p) => { if (!p.tw || st.s > ROUND0 + i || (st.s === ROUND0 + i && st.p >= phs(ROUNDS[i]).indexOf("twistAns"))) pcs.push(p.n); }));
    $("#collected").innerHTML = pcs.length ? pcs.map((n) => `<span class="mini">${n}</span>`).join("") : `<span>The Suraksha Map of Work fills in as you decide…</span>`;
  }

  function optsHTML(r, mode) {
    const x = v(r.id), tot = KEYS.reduce((a, k) => a + x[k], 0);
    return `<div class="opts">${KEYS.map((k) => {
      const o = r.options[k], pct = tot ? Math.round((x[k] * 100) / tot) : 0;
      const cls = mode === "reveal" ? (k === r.correct ? "right" : "wrong") : "";
      return `<div class="opt ${cls}" data-k="${k}">
        <div class="k" style="background:var(--${k})">${k}</div>
        ${cls === "right" ? '<div class="badge">BEST FIT</div>' : `<div class="cnt">${x[k]}</div>`}
        <div class="lbl">${o.l}</div><div class="sub">${o.s}</div><div class="cons">${o.c}</div>
        <div class="pct">${tot ? pct + "%" : ""}</div>
        <div class="bar" style="width:${pct}%;background:var(--${k})"></div></div>`;
    }).join("")}</div>`;
  }

  function joinPanel(size) {
    return `<div class="joinbox"><div class="qr" id="qr" style="width:${size}px;height:${size}px"></div>
      <div><div class="kicker" style="margin-bottom:6px">Join on your phone</div>
      <div class="joinurl mono">${esc(JOIN_URL.replace(/^https?:\/\//, ""))}</div>
      <div class="joincount"><b>${Object.keys(players).length}</b> phones joined</div></div></div>`;
  }

  function view() {
    const sc = cur();
    if (sc.t === "title") return `<div class="screen"><div class="title-grid">
      <div class="title-wrap">
        <div class="kicker">${EVENT.name} · ${EVENT.date}</div>
        <h1>One company.<br>Seven decisions.<br><span style="color:var(--accent)">You pick the product.</span></h1>
        <p class="lead">An interactive journey through UiPath's newest products, told through the story of a Mumbai insurer that has to go AI-first in 12 months.</p>
        <p class="lead" style="margin-top:8px;color:var(--ink)">${EVENT.speakers}</p>
        <div class="legend">${KEYS.map((k) => `<div class="chip"><div class="dot" style="background:var(--${k})"></div>${k}</div>`).join("")}<div class="chip muted">Vote on your phone, or hold up a card</div></div>
      </div>${joinPanel(220)}</div></div>`;

    if (sc.t === "org") return `<div class="screen">
      <div class="kicker">Meet our company</div>
      <h2>Suraksha Mutual General Insurance</h2>
      <p class="lead">A mid-size general insurer, HQ in Lower Parel. Motor, health and home. Growing fast, and running on spreadsheets and goodwill.</p>
      <div class="grid facts">
        <div class="card fact"><div class="n">12 lakh</div><div class="l">active policies</div></div>
        <div class="card fact"><div class="n">1,800</div><div class="l">claims a day</div></div>
        <div class="card fact"><div class="n">14 days</div><div class="l">average claim turnaround</div></div>
        <div class="card fact"><div class="n">3,200</div><div class="l">employees across 3 regions</div></div>
      </div>
      <div class="quote">"The board has given me 12 months: claims settled in <b>3 days</b>, no compromise on compliance, and they want it to be <b>AI-first</b>. Help me pick the right tools, not just the newest ones."<span class="who">Meera Kulkarni · COO, Suraksha Mutual</span></div>
      <div class="hint" style="margin-top:auto">Suraksha Mutual, its people and its numbers are fictional.</div></div>`;

    if (sc.t === "lens") return `<div class="screen">
      <div class="kicker">Your decision lens</div>
      <h2>Five questions before you pick any product</h2>
      <p class="lead">Keep these in mind. Every round comes back to one of them.</p>
      <div class="grid lens">${LENS.map((l, i) => `<div class="card"><div class="num">Q${i + 1}</div><div class="q">${l.q}</div><div class="a" style="filter:blur(5px)" data-unblur>${l.a}</div></div>`).join("")}</div>
      <div class="hint">The answers stay blurred for now. They unlock in the finale. (Click a card to peek.)</div></div>`;

    if (sc.t === "round") {
      const r = ROUNDS[sc.i], ph = curPH();
      const head = `<div class="kicker">Round ${sc.i + 1} of ${ROUNDS.length} · ${r.stage}</div>`;
      if (ph === "scene") return `<div class="screen">${head}<h2>${r.title}</h2>
        <div class="scene"><div><ul class="facts-list">${r.facts.map((f) => `<li>${f}</li>`).join("")}</ul></div>
        <div><div class="quote" style="margin-top:0">"${r.quote}"<span class="who">${r.who}</span></div></div></div>
        <div class="ask">${r.question}</div></div>`;
      if (ph === "vote") {
        const tot = KEYS.reduce((a, k) => a + v(r.id)[k], 0);
        return `<div class="screen">${head}<h2>${strip(r.question)} <span class="votecount">${tot} vote${tot === 1 ? "" : "s"}</span><span class="votetimer" id="votetimer">${voteLeft(r)}</span></h2>${optsHTML(r, "vote")}
        <div class="hint">${isLive() ? "Voting is open on phones 📱. Cards up too! Press <kbd>→</kbd> to close voting and reveal." : "Cards up! Tap an option or press <kbd>1</kbd>–<kbd>4</kbd> to count. Press <kbd>→</kbd> to reveal."}</div></div>`;
      }
      if (ph === "reveal" || ph === "demo") {
        const m = majority(r.id);
        const verdict = m === null ? "" : m === r.correct ? `<span class="verdict y">✓ The room got it</span>` : `<span class="verdict n">✗ The room picked ${m}</span>`;
        const demo = ph === "demo" ? `<div class="demo-overlay"><img class="bg" src="${esc(r.demo)}" alt=""><img src="${esc(r.demo)}" alt=""></div>` : "";
        return `<div class="screen${ph === "demo" ? " static" : ""}">${head}<h2>Best fit: ${r.options[r.correct].l}${verdict}</h2><div class="optwrap">${ph === "demo" ? demo : optsHTML(r, "reveal")}</div>
        <div class="why">${r.why.map((w) => `<div class="card">${w}</div>`).join("")}</div></div>`;
      }
      return `<div class="screen"><div class="twist">${head}<span class="bolt">⚡ PLOT TWIST</span>
        <div class="prompt">${r.twist.p}</div>
        ${ph === "twistAns" ? `<div class="ans"><div class="big">→ ${r.twist.a}</div><p>${r.twist.d}</p></div>` : `<p class="hint" style="margin-top:22px;font-size:15px">Does the answer change? Shout it out, then press <kbd>→</kbd>.</p>`}
      </div></div>`;
    }

    if (sc.t === "map") {
      const rev = revealedIdx(), rightN = rev.filter((i) => majority(ROUNDS[i].id) === ROUNDS[i].correct).length;
      let delay = 0;
      return `<div class="screen">
      <div class="kicker">The finale</div><h2>The Suraksha setup <span style="color:var(--accent)">you</span> designed</h2>
      <div class="map">${LAYERS.map((L, li) => `<div class="layer"><h4>${L}</h4>${ROUNDS.flatMap((r) => r.pieces.filter((p) => p.L === li).map((p) => `<div class="piece ${p.tw ? "tw" : ""}" style="animation-delay:${delay++ * 0.18}s">${p.n}<small>${p.s}${p.tw ? " · plot twist" : ""}</small></div>`)).join("")}</div>`).join("")}</div>
      <div class="outcome">
        <div class="card fact"><div class="n" style="color:var(--accent)">${rightN}/${ROUNDS.length}</div><div class="l">rounds the room got right</div></div>
        <div class="card fact"><div class="n">14 → 3</div><div class="l">days, the claim-turnaround target</div></div>
        <div class="card fact"><div class="n">1</div><div class="l">trap avoided: not everything needs an agent</div></div>
        <div class="card fact"><div class="n">0</div><div class="l">policy PDFs needed for governance</div></div>
      </div></div>`;
    }

    if (sc.t === "leaders") {
      const lb = leaderboard(), top = lb.slice(0, 3), rest = lb.slice(3, 10);
      const order = [top[1], top[0], top[2]];
      const medal = ["🥈", "🥇", "🥉"], h = [150, 200, 120];
      if (!lb.length) return `<div class="screen"><div class="kicker">Top Architects</div><h2>No phone votes yet</h2><p class="lead">Switch to live mode and run a round to see the leaderboard here.</p></div>`;
      return `<div class="screen">
        <div class="kicker">Top Architects of Mumbai</div><h2>The sharpest product pickers in the room</h2>
        <div class="podium">${order.map((p, i) => p ? `<div class="pod" style="animation-delay:${[0.6, 1.2, 0][i]}s"><div class="pnick">${medal[i]} ${esc(p.nick)}</div><div class="pscore">${p.score}/${ROUNDS.length}</div><div class="pbar" style="height:${h[i]}px">#${p.rank}</div></div>` : `<div class="pod empty"></div>`).join("")}</div>
        ${rest.length ? `<div class="restlist">${rest.map((p) => `<div class="rrow"><span class="mono">#${p.rank}</span> ${esc(p.nick)} <b>${p.score}</b></div>`).join("")}</div>` : ""}
        <div class="hint">${lb.length} players · ties broken by fastest correct answers</div></div>`;
    }

    if (sc.t === "close") return `<div class="screen"><div class="title-wrap">
      <div class="kicker">Take it home</div>
      <h1>Pick the problem first.<br><span style="color:var(--accent)">Then the product.</span></h1>
      <div class="grid" style="grid-template-columns:1.3fr 1fr;gap:22px;margin-top:30px;align-items:stretch">
        <div class="card"><h3 style="margin-bottom:12px">The decision lens</h3>${LENS.map((l, i) => `<div style="margin-bottom:10px;font-size:15px;line-height:1.45"><span class="mono" style="color:var(--accent)">Q${i + 1}</span> <b>${l.q}</b><br><span class="muted">${l.a}</span></div>`).join("")}</div>
        <div class="card" style="display:grid;place-items:center;text-align:center;border-style:dashed">
          <div><div style="width:180px;height:180px;margin:0 auto 14px;border-radius:14px;border:2px dashed #3a4a85;display:grid;place-items:center" class="muted mono">QR here</div>
          <h3>Get the cheat sheet</h3><p class="muted" style="margin-top:6px;font-size:14px">+ connect with Parth &amp; Jeet</p></div></div>
      </div>
      <p class="lead" style="margin-top:22px">Thank you, Mumbai. Questions?</p>
    </div></div>`;
  }

  function notesText() {
    const sc = cur(); if (sc.t !== "round") return NOTES[sc.t] || "";
    const r = ROUNDS[sc.i];
    return r.notes + (r.demo && curPH() === "reveal" ? "<br><br>Press → to show the product GIF while you talk through the three reasons; → again moves to the plot twist." : "");
  }

  function drawQR() {
    const el = document.getElementById("qr"); if (!el || el.dataset.done) return;
    el.dataset.done = 1;
    if (window.QRCode) { try { new QRCode(el, { text: JOIN_URL, width: el.offsetWidth - 20, height: el.offsetWidth - 20, colorDark: "#0a0f1e", colorLight: "#ffffff", correctLevel: QRCode.CorrectLevel.M }); return; } catch (e) {} }
    el.innerHTML = `<span class="muted mono" style="font-size:12px;padding:10px;text-align:center">QR unavailable offline — use the URL</span>`;
  }

  function render(fromData) {
    const sc = cur();
    if (sc.t === "round" && curPH() === "vote" && !st.openedAt[ROUNDS[sc.i].id]) st.openedAt[ROUNDS[sc.i].id] = Date.now();
    $("#stage").innerHTML = view();
    if (fromData) document.querySelectorAll(".screen,.piece,.pod").forEach((e) => e.classList.add("static"));
    journey(); save(); publish(); drawQR();
    $("#notes").innerHTML = `<h5>SPEAKER NOTES</h5>${notesText()}`;
    document.querySelectorAll(".opt").forEach((el) => {
      el.onclick = () => addVote(el.dataset.k, 1);
      el.oncontextmenu = (e) => { e.preventDefault(); addVote(el.dataset.k, -1); };
    });
    const vt = $("#votetimer"); if (vt) { vt.style.cursor = "pointer"; vt.title = "Restart (R)"; vt.onclick = restartVote; }
    document.querySelectorAll("[data-go]").forEach((el) => (el.onclick = () => go(+el.dataset.go)));
    document.querySelectorAll("[data-unblur]").forEach((el) => (el.parentElement.onclick = () => { el.style.filter = el.style.filter ? "" : "blur(5px)"; }));
  }
  // re-render on data changes only where it matters (avoids replaying animations everywhere)
  let dataT;
  function onData() {
    clearTimeout(dataT);
    dataT = setTimeout(() => {
      const sc = cur(), ph = curPH();
      const relevant = sc.t === "title" || sc.t === "leaders" || (sc.t === "round" && (ph === "vote" || ph === "reveal"));
      if (relevant) render(true); else { journey(); publish(); }
    }, 120);
  }

  /* ---------- timer ---------- */
  let tick = null;
  const fmt = (s) => String(Math.floor(s / 60)).padStart(2, "0") + ":" + String(s % 60).padStart(2, "0");
  const VOTE_SECS = 45;
  const voteLeft = (r) => Math.max(0, VOTE_SECS - Math.floor((Date.now() - (st.openedAt[r.id] || Date.now())) / 1000));
  function toggleTimer() {
    st.running = !st.running;
    if (st.running) tick = setInterval(() => { st.elapsed++; $("#timer").textContent = fmt(st.elapsed); if (st.elapsed % 10 === 0) save(); }, 1000);
    else clearInterval(tick);
    $("#timer").style.borderColor = st.running ? "var(--accent)" : "";
  }
  function restartVote() {
    const r = roundOf();
    if (r && curPH() === "vote") { st.openedAt[r.id] = Date.now(); render(true); }
  }
  setInterval(() => {
    const el = $("#votetimer"), r = roundOf();
    if (!el || !r) return;
    const n = voteLeft(r); el.textContent = n; el.classList.toggle("done", n === 0);
  }, 1000);
  $("#timer").textContent = fmt(st.elapsed);
  $("#timer").onclick = toggleTimer;
  $("#prevBtn").onclick = prev;
  $("#nextBtn").onclick = next;
  $("#mode").onclick = async () => {
    if (beOk) return toggleLive();
    if (!BE.requiresAuth || !BE.signIn) return toast("Backend not connected — manual counting only");
    try {
      if (authState && authState.signedIn && !authState.ok) await BE.signOut();
      await BE.signIn();
    } catch (e) { toast("Sign-in failed: " + (e.code || e.message)); }
  };

  function toggleLive() {
    if (!beOk) { toast("Backend not connected — manual counting only"); return; }
    st.live = !st.live; toast(st.live ? "LIVE: counting phone votes" : "MANUAL: count cards with keys 1–4"); render();
  }

  let xAt = 0;
  document.addEventListener("keydown", (e) => {
    if (e.target.tagName === "INPUT") return;
    const codeMap = { Digit1: "A", Digit2: "B", Digit3: "C", Digit4: "D", Numpad1: "A", Numpad2: "B", Numpad3: "C", Numpad4: "D" };
    if (codeMap[e.code]) { addVote(codeMap[e.code], e.shiftKey ? -1 : 1); return; }
    switch (e.key) {
      case "ArrowRight": case " ": case "PageDown": e.preventDefault(); next(); break;
      case "ArrowLeft": case "PageUp": e.preventDefault(); prev(); break;
      case "Home": go(0); break;
      case "0": { const r = roundOf(); if (r && !isLive()) { st.manual[r.id] = { A: 0, B: 0, C: 0, D: 0 }; render(); } break; }
      case "l": case "L": toggleLive(); break;
      case "s": case "S": {
        const r = roundOf();
        if (!BE.simulate || BE.kind !== "mock") { toast("Simulation is only available in test (mock) mode"); break; }
        if (!r || curPH() !== "vote") { toast("Go to a vote step first"); break; }
        BE.simulate(r.id, 40).then(() => toast("Simulated 40 phone votes")).catch((er) => toast(er.message));
        break;
      }
      case "x": case "X": {
        if (Date.now() - xAt < 1500) {
          BE.reset().catch((er) => toast("Reset failed: " + er.message)).then(() => { st.manual = {}; st.openedAt = {}; st.epoch = Date.now(); lastPub = ""; render(); toast("Session reset: players and votes cleared"); });
          xAt = 0;
        } else { xAt = Date.now(); toast("Press X again to reset the whole session"); }
        break;
      }
      case "n": case "N": $("#notes").classList.toggle("on"); break;
      case "t": case "T": toggleTimer(); break;
      case "r": case "R": restartVote(); break;
      case "f": case "F": try { document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen().catch(() => {}); } catch (err) {} break;
      case "?": $("#help").classList.toggle("on"); break;
      case "Escape": $("#help").classList.remove("on"); $("#notes").classList.remove("on"); break;
    }
  });
  $("#help").onclick = () => $("#help").classList.remove("on");

  /* ---------- boot ---------- */
  function startLive() {
    if (beOk) return;
    beOk = true;
    unsubs.push(BE.onVotes((list) => { allVotes = list || []; onData(); }));
    unsubs.push(BE.onPlayers((p) => { players = p || {}; onData(); }));
    lastPub = ""; render();
  }
  function stopLive() {
    unsubs.forEach((u) => { try { u(); } catch (e) {} }); unsubs = [];
    beOk = false; render();
  }
  render();
  ROUNDS.forEach((r) => { if (r.demo) new Image().src = r.demo; }); // warm the cache so big GIFs play smoothly on stage
  BE.init("presenter").then(() => {
    if (!BE.requiresAuth) { startLive(); toast("Test mode: open vote.html in other tabs to act as phones"); return; }
    BE.onAuth((a) => {
      authState = a;
      if (a.ok) { startLive(); toast("Signed in as " + a.email + " — LIVE"); }
      else { stopLive(); if (a.signedIn) toast(a.email + " is not the presenter account"); }
    });
  }).catch((e) => { beOk = false; initFailed = true; toast("Can't reach Firebase — manual mode. " + e.message); render(); });
})();
