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
js/config.js        ← switch backend here (mock | firestore)
js/content.js       ← all story content: rounds, options, answers, notes (presenter only)
js/backend.js       backend interface + mock implementation (Firestore comes next)
js/presenter.js     presenter engine
js/vote.js          phone engine
```
Phones never load `content.js`. They only see what the presenter publishes, and the correct answer is sent only after the reveal.

## Try it locally (test mode, no server needed)
```bash
cd suraksha-live
python -m http.server 8000
```
1. Open `http://localhost:8000/index.html` (the presenter).
2. Open `http://localhost:8000/vote.html` in 2–3 **other tabs in the same browser**. Each tab acts as a separate phone.
3. Join from each tab, then step through the presenter with `→`. The phone tabs follow along.
4. During a vote, press `S` on the presenter to add 40 simulated voters.
5. To reset everything, press `X` twice.

In test mode the tabs sync through the browser's own storage, so real phones won't connect yet. That's what the Firestore step adds.

## Presenter keys
`→`/`Space` next · `←` back · `L` Live ↔ Manual · `1–4` count cards (manual) · `S` simulate (test mode) · `X X` reset · `T` timer · `N` notes · `F` fullscreen · `?` help

**Live vs Manual:** Live shows phone votes. If the network fails, press `L` and count the coloured cards with keys 1–4. The story never stops.

## Deploy to GitHub Pages
1. Create a new repo and push these files to `main`.
2. Go to Settings → Pages → Deploy from branch → `main` / root.
3. Open `https://<username>.github.io/<repo>/`. The QR on the title slide points to `vote.html` on the same site automatically.

## Leaderboard rules
1 point for each round where your phone vote matches the best fit. Ties are broken by total time to a correct answer, measured from when voting opened. Plot twists are shout-outs and aren't scored.

## Next step: Firestore
`js/backend.js` will get a `FirestoreBackend` with the same methods as the mock (`join`, `onState`, `vote`, `setState`, `onVotes`, `onPlayers`, `reset`), plus security rules and presenter sign-in with Google. No UI code changes are needed.
