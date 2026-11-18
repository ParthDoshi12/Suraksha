// ============================================================
// Rehearsal helper: rules check + load test against your REAL project.
//
//   cd tools && npm install firebase && node simulate.mjs 150
//
// 1. Joins N fake phones (nicknames "Sim 001"...).
// 2. Checks that the security rules block what they should.
// 3. Each time you open a vote on the presenter, every fake phone votes
//    within ~10 s and the script reports successes, failures and latency.
// Ctrl+C to stop. Press X twice on the presenter afterwards to clear sims.
// ============================================================
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { initializeApp } from "firebase/app";
import { initializeFirestore, doc, setDoc, getDocs, collection, onSnapshot, serverTimestamp } from "firebase/firestore";

const N = parseInt(process.argv[2] || "100", 10);
const sandbox = { window: {} };
vm.runInNewContext(readFileSync(new URL("../js/config.js", import.meta.url), "utf8"), sandbox);
const CFG = sandbox.window.SURAKSHA_CONFIG;
const app = initializeApp(CFG.firebase);
const db = initializeFirestore(app, {});
const sid = CFG.sessionId;
const sess = doc(db, "sessions", sid);
const rnd = () => Math.random().toString(36).slice(2, 12).replace(/[^a-z0-9]/g, "").padEnd(10, "0");
const phones = Array.from({ length: N }, (_, i) => ({ id: "d_sim" + rnd(), nick: "Sim " + String(i + 1).padStart(3, "0") }));

async function expectDenied(label, fn) {
  try { await fn(); console.log("  ✗ RULES GAP:", label, "was allowed"); }
  catch (e) { console.log(e.code === "permission-denied" ? "  ✓ blocked:" : "  ? unexpected error:", label, e.code === "permission-denied" ? "" : e.message); }
}

console.log(`Joining ${N} simulated phones to session "${sid}"…`);
let t0 = Date.now();
const joined = await Promise.allSettled(phones.map((p) => setDoc(doc(db, "sessions", sid, "players", p.id), { nick: p.nick, joinedAt: serverTimestamp() })));
console.log(`  ${joined.filter((r) => r.status === "fulfilled").length}/${N} joined in ${Date.now() - t0} ms`);
const firstFail = joined.find((r) => r.status === "rejected"); if (firstFail) console.log("  first join error:", firstFail.reason.message);

console.log("Rules checks (a phone must NOT be able to do these):");
await expectDenied("read all votes", () => getDocs(collection(db, "sessions", sid, "votes")));
await expectDenied("read player list", () => getDocs(collection(db, "sessions", sid, "players")));
await expectDenied("change session state", () => setDoc(sess, { screen: "lobby", hacked: true }));
await expectDenied("vote with invalid choice", () => setDoc(doc(db, "sessions", sid, "votes", "discover_" + phones[0].id), { roundId: "discover", choice: "Z", deviceId: phones[0].id, nick: "x", ts: serverTimestamp() }));
await expectDenied("vote under someone else's id", () => setDoc(doc(db, "sessions", sid, "votes", "discover_d_someoneelse01"), { roundId: "discover", choice: "A", deviceId: phones[0].id, nick: "x", ts: serverTimestamp() }));

let lastRound = null;
console.log("\nWaiting… open a vote on the presenter (it must be signed in and LIVE).");
onSnapshot(sess, async (snap) => {
  const s = snap.data();
  if (!s) return;
  if (s.screen !== "round" || s.phase !== "vote" || s.roundId === lastRound) return;
  lastRound = s.roundId;
  console.log(`\nVoting open: ${s.roundId}. ${N} phones voting over ~10 s…`);
  const start = Date.now(), lat = [];
  const res = await Promise.allSettled(phones.map((p) => new Promise((ok, bad) => setTimeout(async () => {
    const t = Date.now();
    try {
      await setDoc(doc(db, "sessions", sid, "votes", s.roundId + "_" + p.id), { roundId: s.roundId, choice: "ABCD"[Math.floor(Math.random() * 4)], deviceId: p.id, nick: p.nick, ts: serverTimestamp() });
      lat.push(Date.now() - t); ok();
    } catch (e) { bad(e); }
  }, Math.random() * 10000))));
  lat.sort((a, b) => a - b);
  const fails = res.filter((r) => r.status === "rejected");
  console.log(`  ✓ ${N - fails.length}/${N} votes accepted in ${((Date.now() - start) / 1000).toFixed(1)} s · latency p50 ${lat[Math.floor(lat.length / 2)] || "-"} ms, p95 ${lat[Math.floor(lat.length * 0.95)] || "-"} ms`);
  if (fails.length) console.log("  first error:", fails[0].reason.code || fails[0].reason.message);
});
