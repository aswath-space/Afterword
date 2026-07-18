# Afterword

A word game crossed with snakes and ladders. Two to four players build **one shared chain of words** — each word must start with the last letter of the word before it (CARD → DREAM → MORE → ENTRY) — and race a serpent-and-ladder board on a single phone, pass-and-play style.

- **Every letter counts.** A word moves your token one square per letter, so word *length* is a navigation choice: the live aim preview shows exactly where a word lands — on a ladder foot, a snake's head, or the finish.
- **Ladders climb, snakes bargain.** Land on a snake and you get one chance: play a long-enough rescue word (up to 8 letters, any starting letter) before the 20-second clock drains, or slide.
- **The board remembers.** Played words stamp their letters onto the squares they cross — by the end, the board is a record of the match.
- **Forgiving, not free.** One take-back per game is free; each one after costs 3 squares.
- **Shareable boards.** Every board is deterministic from its seed — share a link (`?b=v1.<seed>.<length>`) and a friend plays the exact same snakes and ladders. No backend anywhere.

Built as an installable, fully offline PWA: the shell, fonts, and the whole dictionary (ENABLE word list + a curated modern supplement, compressed to a 444 KB asset) are precached by a service worker.

## Run it

```sh
npm install
npm run dev        # http://localhost:5173
```

## Verify it

```sh
npm test           # unit + component tests (vitest)
npx tsc -b         # typecheck
npm run build      # production build (also regenerates public/dict.bin)
```

There's also an end-to-end "release candidate" playtest that plays full games against the production build + service worker (including offline):

```sh
npm run build && npm run preview   # terminal 1
node scripts/playtest-rc.mjs       # terminal 2
```

## Stack

React 19 · TypeScript · Zustand (persisted to localStorage) · Vite + vite-plugin-pwa · Vitest · a pure, framework-free game engine under `src/engine/`. Token motion is hand-rolled on the Web Animations API; dialogs, confetti, and the countdown ring are dependency-free.

## Word list

Validation uses the public-domain [ENABLE](https://everything2.com/title/ENABLE+word+list) list plus a curated modern supplement, minus a slur denylist (`src/dictionary/*.txt`). Edit those files and run `npm run gen-dict` to rebuild the dictionary asset.

## License

[MIT](LICENSE). Play it live at **[afterwordgame.netlify.app](https://afterwordgame.netlify.app)**.
