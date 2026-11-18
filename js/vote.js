/* ============================================================
   PHONE VOTING — renders whatever state the presenter publishes.
   Phones never see the answers until the presenter reveals them.
   ============================================================ */
(function () {
  const BE = window.SurakshaBackend;
  const KEYS = ["A", "B", "C", "D"];
  const LS = "suraksha-voter-" + BE.sid;
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  const ADJ = ["Turbo", "Agentic", "Monsoon", "Masala", "Express", "Fearless", "Midnight", "Fast-Track", "Cutting", "Spicy", "Sharp", "Golden", "Rapid", "Chill"];
  const NOUN = ["Vada Pav", "Dabbawala", "Local Train", "Sea Link", "Kaali-Peeli", "Pav Bhaji", "Marine Drive", "Bandra Bot", "Chai", "Gateway", "Bhel Puri", "Juhu Wave", "Misal", "Rickshaw"];
  const randomNick = () => ADJ[Math.floor(Math.random() * ADJ.length)] + " " + NOUN[Math.floor(Math.random() * NOUN.length)];
  const cleanNick = (s) => String(s || "").replace(/[<>]/g, "").replace(/\s+/g, " ").trim().slice(0, 20);

  let me = { nick: "", joined: false, votes: {}, correct: {} };
  try { const sv = JSON.parse(BE.store.getItem(LS) || "null"); if (sv) me = Object.assign(me, sv); } catch (e) {}
  const save = () => { try { BE.store.setItem(LS, JSON.stringify(me)); } catch (e) {} };

  let state = null, lastKey = "", draftNick = me.nick || randomNick(), sending = false, errMsg = "";

  const myScore = () => Object.keys(me.correct).filter((r) => me.votes[r] && me.votes[r] === me.correct[r]).length;
  function chips() {
    $("#nickChip").hidden = !me.joined; $("#nickChip").textContent = "👤 " + me.nick;
    const revealed = Object.keys(me.correct).length;
    $("#scoreChip").hidden = !me.joined || !revealed; $("#scoreChip").textContent = `⭐ ${myScore()}/${revealed}`;
  }
  const buzz = (p) => { try { navigator.vibrate && navigator.vibrate(p); } catch (e) {} };

  /* ---------- screens ---------- */
  function joinView() {
    return `<div class="kicker">UiPath Mumbai · Year-End Meet-Up</div>
      <h1>You're the architect today.</h1>
      <p style="margin-top:10px">Vote on each decision. Get the best fit right to climb the <b style="color:var(--ink)">Top Architects</b> leaderboard.</p>
      <label for="nick">Your nickname (shown on the big screen)</label>
      <div class="namerow"><input id="nick" maxlength="20" autocomplete="off" value="${esc(draftNick)}"><button class="dice" id="dice" aria-label="New random nickname">🎲</button></div>
      <button class="btn" id="joinBtn">Join the session →</button>
      <div class="err">${esc(errMsg)}</div>
      <div class="foot">No sign-up · nothing personal is collected · keep it friendly 🙂</div>`;
  }
  function lobbyView() {
    return `<div class="center"><div class="big-emoji">🎬</div><h2>You're in, ${esc(me.nick)}!</h2>
      <p>Eyes on the big screen.<br>Voting buttons appear here automatically when a round opens.</p>
      <div class="legend">${KEYS.map((k) => `<span style="background:var(--${k})">${k}</span>`).join("")}</div>
      <button class="btn ghost" id="rename">Change nickname</button></div>`;
  }
  function sceneView(s) {
    return `<div class="center"><div class="kicker">Round ${s.roundIdx + 1} of ${s.total} · ${esc(s.stage)}</div>
      <h2>${esc(s.title)}</h2><div class="pulse"></div><p>Listen to the story…<br>voting opens in a moment.</p></div>`;
  }
  function voteView(s) {
    const mine = me.votes[s.roundId];
    return `<div class="kicker">Round ${s.roundIdx + 1} of ${s.total} · ${esc(s.stage)}</div>
      <h2>${esc(s.question)}</h2>
      <div class="opts ${mine ? "has-sel" : ""}">${KEYS.map((k) => `<button class="opt ${mine === k ? "sel" : ""}" data-k="${k}">
        <span class="k" style="background:var(--${k})">${k}</span><span><span class="t">${esc(s.options[k].l)}</span><span class="s" style="display:block">${esc(s.options[k].s)}</span></span></button>`).join("")}</div>
      <div class="locked">${sending ? "Sending…" : mine ? `Locked in: <b>${mine}</b> · tap another to change` : "Tap your pick"}</div>
      <div class="err">${esc(errMsg)}</div>`;
  }
  function revealView(s) {
    const mine = me.votes[s.roundId], ok = mine && mine === s.correct;
    const cls = !mine ? "none" : ok ? "good" : "bad";
    const head = !mine ? "You sat this one out" : ok ? "Nailed it! 🎯" : `You picked ${mine}`;
    const sub = !mine ? "Catch the next round!" : ok ? "+1 to your score" : "Listen to why. It's a great one to learn from.";
    return `<div class="center" style="width:100%"><div class="kicker">Round ${s.roundIdx + 1} · ${esc(s.stage)}</div>
      <div class="result ${cls}" style="width:100%"><div class="big-emoji">${!mine ? "🙈" : ok ? "✅" : "🤔"}</div>
      <div class="head">${head}</div><p>${sub}</p>
      <div class="bestfit card"><span class="k" style="background:var(--${s.correct})">${s.correct}</span><div><div class="kicker" style="margin:0">Best fit</div><b>${esc(s.correctLabel)}</b></div></div></div>
      <p>Your score: <b style="color:var(--accent2)">${myScore()}</b> of ${Object.keys(me.correct).length}</p></div>`;
  }
  function twistView() {
    return `<div class="center"><div class="big-emoji">⚡</div><h2>Plot twist!</h2><p>Eyes on the stage 👀<br>Does the answer change? <b style="color:var(--ink)">Shout it out!</b></p></div>`;
  }
  function finaleView(s) {
    const lb = s.leaderboard || [], id = BE.deviceId(), mine = lb.find((p) => p.id === id);
    return `<div class="center" style="width:100%"><div class="kicker">Top Architects</div>
      ${mine ? `<p>You finished</p><div class="rank">#${mine.rank}</div><p>of ${lb.length} · <b style="color:var(--accent2)">${mine.score}/${s.total}</b> correct</p>` : `<div class="big-emoji">🏁</div><h2>That's a wrap!</h2>`}
      <div class="toplist">${lb.slice(0, 5).map((p) => `<div class="${p.id === id ? "me" : ""}"><span class="mono">#${p.rank}</span> ${esc(p.nick)} <b>${p.score}</b></div>`).join("")}</div>
      <p style="margin-top:8px">Thanks for playing, ${esc(me.nick)}! 🙏<br>Pick the problem first. Then the product.</p></div>`;
  }

  /* ---------- render ---------- */
  function render(force) {
    chips();
    const s = state;
    if (s && s.screen === "round" && s.correct && !me.correct[s.roundId]) { me.correct[s.roundId] = s.correct; save(); chips(); }
    const key = !me.joined ? "join" : !s || s.screen === "lobby" ? "lobby" : s.screen === "round" ? `r:${s.roundId}:${s.phase}` : "finale:" + JSON.stringify(s.leaderboard || []).length;
    if (key === lastKey && !force) return;
    if (key.endsWith(":vote") && !lastKey.endsWith(":vote") && lastKey !== "") buzz([60, 40, 60]);
    lastKey = key;
    let html;
    if (!me.joined) html = joinView();
    else if (!s || s.screen === "lobby") html = lobbyView();
    else if (s.screen === "round") html = s.phase === "scene" ? sceneView(s) : s.phase === "vote" ? voteView(s) : s.phase === "reveal" ? revealView(s) : twistView();
    else html = finaleView(s);
    const v = $("#view");
    v.style.animation = "none"; void v.offsetWidth; v.style.animation = "";
    v.innerHTML = html;
    bind();
  }

  function bind() {
    const dice = $("#dice"), nick = $("#nick"), jb = $("#joinBtn"), rn = $("#rename");
    if (nick) nick.oninput = () => (draftNick = nick.value);
    if (dice) dice.onclick = () => { draftNick = randomNick(); nick.value = draftNick; };
    if (jb) jb.onclick = async () => {
      const n = cleanNick(nick.value);
      if (n.length < 2) { errMsg = "Pick a nickname with at least 2 characters"; render(true); return; }
      jb.disabled = true; errMsg = "";
      try { await BE.join(n); me.nick = n; me.joined = true; save(); render(true); }
      catch (e) { errMsg = "Couldn't join — check your connection and try again"; jb.disabled = false; render(true); }
    };
    if (rn) rn.onclick = () => { me.joined = false; draftNick = me.nick; save(); render(true); };
    document.querySelectorAll(".opt").forEach((b) => (b.onclick = () => castVote(b.dataset.k)));
  }

  async function castVote(k) {
    const s = state; if (!s || s.phase !== "vote" || sending) return;
    const prev = me.votes[s.roundId];
    me.votes[s.roundId] = k; sending = true; errMsg = ""; render(true); buzz(25);
    try { await BE.vote(s.roundId, k); }
    catch (e) {
      if (prev) me.votes[s.roundId] = prev; else delete me.votes[s.roundId];
      errMsg = e.message === "closed" ? "Voting just closed for this round" : "Vote didn't go through — tap again";
    }
    sending = false; save(); render(true);
  }

  /* ---------- boot ---------- */
  render(true);
  window.addEventListener("offline", () => ($("#net").hidden = false));
  window.addEventListener("online", () => ($("#net").hidden = true));
  BE.init().then(() => {
    BE.onState((s) => { state = s; if (sending) return; errMsg = ""; render(); });
  }).catch((e) => { $("#view").innerHTML = `<div class="center"><div class="big-emoji">🛠️</div><h2>Voting isn't live yet</h2><p>${esc(e.message)}</p></div>`; });
})();
