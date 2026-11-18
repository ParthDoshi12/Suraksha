# The Suraksha Story: live product-fit voting

An interactive session for the **UiPath Mumbai Community Year-End Meet-Up (5 Dec 2026)** by Parth Doshi & Jeet Doshi.
The audience follows a fictional insurer, Suraksha Mutual, through 7 decisions and votes on their phones for the right UiPath product at each step.

| Page | Who uses it | What it does |
|---|---|---|
| `index.html` | Presenter laptop → projector | Story slides, live vote bars, reveals, plot twists, Map of Work, Top Architects leaderboard |
| `vote.html` | Audience phones (QR on the title slide) | Join with a nickname, vote A–D, see if you got it right, final rank |

## Structure
```
index.html          presenter
vote.html           phone voting page
css/presenter.css   presenter styles
css/vote.css        phone styles
js/config.js        ← Firebase config, presenter Gmail, backend switch
firestore.rules     ← security rules (paste into Firebase console)
tools/simulate.mjs  ← rules check + load test with fake phones
js/content.js       ← all story content: rounds, options, answers, notes (presenter only)
js/backend.js       backend interface: Firestore (live) + mock (offline testing)
js/presenter.js     presenter engine
js/vote.js          phone engine
```
Phones never load `content.js`. They only see what the presenter publishes, and the correct answer is sent only after the reveal.

## One-time Firebase setup (project `suraksha-f8d85`)
1. **Your Gmail:** replace `YOUR_GMAIL@gmail.com` in **both** `js/config.js` and `firestore.rules`.
2. **Firestore:** Console → Build → Firestore Database → *Create database* → location **asia-south1 (Mumbai)** → start in **production mode**.
3. **Rules:** Firestore → *Rules* tab → paste the full `firestore.rules` → **Publish**.
4. **Google sign-in:** Authentication → *Get started* → Sign-in method → **Google** → Enable → pick a support email → Save.
5. **Authorized domain:** Authentication → Settings → Authorized domains → **Add domain** → `parthdoshi12.github.io`.

## Deploy (GitHub Pages)
1. Push these files to the root of `ParthDoshi12/Suraksha` on `main`.
2. Repo → Settings → Pages → *Deploy from a branch* → `main` / `(root)` → Save.
3. Presenter: **https://parthdoshi12.github.io/Suraksha/**
   Phones: **https://parthdoshi12.github.io/Suraksha/vote.html** (also the QR on the title slide)

## Going live
1. Open the presenter URL and click the yellow **🔐 Sign in to go live** badge (top right). Sign in with your Gmail.
2. The badge turns into a green **● LIVE**. The 📱 counter climbs as people scan the QR.
3. Before the audience joins, press **X twice** to clear rehearsal data.

| Badge | Meaning |
|---|---|
| 🔐 Sign in to go live | Firebase reachable, you're not signed in yet |
| ⚠ Wrong account · switch | Signed in with a Gmail that isn't the presenter account |
| ● LIVE | Phone votes are counting |
| MANUAL | You pressed `L`: count cards with keys 1–4 |
| OFFLINE · MANUAL | Firebase unreachable: cards only, the story keeps going |

## Rehearse & load-test
```bash
cd tools && npm install && node simulate.mjs 150
```
This joins 150 fake phones and checks that the rules **block** phones from reading votes, changing the session or voting with bad data. Then every time you open a vote on the presenter, all 150 vote within ~10 s and it prints accepted/failed counts and latency. Press **X twice** on the presenter afterwards.

Also test on real phones: one on Wi-Fi, one on mobile data, one iPhone, one Android.

## Test without Firebase
Add `?backend=mock` to both pages, e.g. `index.html?backend=mock` and `vote.html?backend=mock` in other tabs of the **same browser**. Each tab acts as a phone. Press `S` during a vote for 40 simulated voters.

## Presenter keys
`→`/`Space` next · `←` back · `L` Live ↔ Manual · `1–4` count cards (manual) · `S` simulate (mock only) · `X X` reset session · `T` timer · `N` notes · `F` fullscreen · `?` help

## How it works
- **Session doc** `sessions/ye2026`: what phones should show (round, phase, options, and the answer only after the reveal, plus the leaderboard at the end). Only the presenter can write it.
- **Votes** `sessions/ye2026/votes/{round}_{device}`: one per phone per round; re-voting overwrites. Accepted only while that round is open.
- **Players** `sessions/ye2026/players/{device}`: nickname for the leaderboard.
- Phones have **no accounts** (no sign-in, and no per-IP sign-up limits on shared venue Wi-Fi). A random device id is kept in the phone's browser.
- **Leaderboard:** 1 point for each round where your vote matches the best fit. Ties are broken by total time to a correct answer.
- **Reset (X X)** clears votes and players; phones wipe their local scores and rejoin automatically.
- **Free-tier usage** for a 150-person session is roughly 2K writes and under 10K reads, well within Firestore's free daily limits.
