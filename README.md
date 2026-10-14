# Awesome Games

One Next.js app, one origin. Each game is a top-level directory. The dashboard discovers games from disk. Shared code lives in `common/`.

## Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). `/` redirects to `/dashboard`.

## Layout

| Path | Role |
|---|---|
| `app/` | URL shell: root layout, `/`, `/dashboard`, and generated `/game/...` pages |
| `dashboard/` | Game grid. It does not list games in source |
| `leaders/` | The Leaders game: rules, lobby, and UI |
| `common/` | Code shared by games, including P2P |
| `public/` | Static files. Next serves only this folder |
| `scripts/` | Route sync and the new-game command |

A game is any immediate child directory whose `manifest.json` has `"kind": "game"`. The directory name is the URL slug. `dashboard/` is not a game.

Routable screens live in `<slug>/app/**/page.tsx` and are mirrored under `/game/<slug>/`. `npm run dev` and `npm run build` run `scripts/sync-game-routes.mjs` first. That script writes one-line re-exports in `app/game/` and deletes shims whose source page is gone.

## URLs

| URL | Screen |
|---|---|
| `/dashboard` | Game grid |
| `/game/leaders` | Leaders play screen |
| `/game/leaders/room/[code]` | Leaders room |
| `/game/leaders/room/[code]/game` | Leaders match |

`/play`, `/lobby`, and `/room/...` redirect to the Leaders paths above.

## Add a game

```bash
npm run create-game -- <slug>
```

The slug is lowercase letters, digits, and single hyphens. The command writes `<slug>/manifest.json`, `<slug>/paths.ts`, and `<slug>/app/page.tsx`, then syncs the route. It does not edit the dashboard. Refresh `/dashboard` to see the new card.

## Shared P2P

`common/p2p` is the Trystero mesh. `openMesh` joins a room, waits for a signaling relay, watches ICE, and exposes one request channel and one broadcast channel. The caller names the app id, the room code, and the channel names, and handles the handshake.

Leaders keeps lobby and match rules in `leaders/services/room-connection.ts`. That module calls `openMesh` with app id `app.dirigeant` and channels `lobby-intent` and `lobby-feed`. Seat, chat, ready, and game commands stay there.

The behavior contract for that lobby and the rules engine is [docs/p2p-client-port.md](docs/p2p-client-port.md).
