# Client port: backend behavior that must move peer-to-peer

This document is the behavior contract for removing the server from live play. It describes what the backend does today, as implemented and as locked by tests. Server transport (HTTP, STOMP, PostgreSQL, session-token hashing) does not move. The rules, lobby state machine, and message meanings do.

The client that implements this contract is the Leaders game inside one Next.js app. Other games do not import Leaders lobby or rules. They share only `common/`.

| Piece | Where it lives |
|---|---|
| Mesh (Trystero join, relay, ICE, request, broadcast) | `common/p2p` — `openMesh` |
| Leaders lobby, seats, chat, and commands | `leaders/services/room-connection.ts` |
| Leaders rules engine | `leaders/domain/` |
| Play and room screens | `leaders/app/`, served at `/game/leaders` |

`openMesh` takes an app id, a room code, handshake and relay timeouts, and two channel names. Leaders uses app id `app.dirigeant`, request channel `lobby-intent`, and broadcast channel `lobby-feed`. The handshake payload, host authority, and game commands stay in the Leaders connection module.

When this file and the design note in `.cursor/rules/project-specific-guidelines.mdc` disagree, **the engine and the tests win**. Those disagreements are listed in [Engine vs written rules](#engine-vs-written-rules).

Infrastructure that stays out of the game client: PostgreSQL, Flyway, JDBC, actuator health, Swagger, CORS, the `/app/echo` demo, STOMP broker, and SHA-256 storage of seat tokens.

---

## 1. What each peer must own

| Concern | Must live on the clients |
|---|---|
| Lobby | Create, join, leave, ready, roles, unique names, room status |
| Presence | Connect, disconnect, guest join/leave, ready, game started |
| Chat | Player channel and spectator channel, with role gates |
| Match setup | Colors, crowns, shuffled deck, first player, opening offers |
| Rules | Every command, rejection, phase change, capture, and ability |
| Agreement | One shared state, a monotonic version, identical resolution on both peers |

Peers need a shared initial state (or a shared seed plus identical shuffle). `GameStateFactory` uses `java.util.Random` with no seed. Piece ids, the game id, and the deck order are random. If each client shuffles alone, the matches diverge.

Colors are fixed at start, not random:

- **Host player id = BLACK.** Crown cell **36** `(q=0, r=3)`.
- **Guest player id = WHITE.** Crown cell **0** `(q=0, r=-3)`.

`RoomLobbyQueryAdapter.toLobby` maps host → `blackPlayerId` and guest → `whitePlayerId`.

---

## 2. Lobby

### 2.1 Identity and validation

Username, entire string, case-sensitive:

- Pattern: `[a-zA-Z0-9_]{3,64}`
- Failure message: `Username must be 3-64 characters: letters, digits, underscore`
- Unique inside one room. The same name may exist in another room.
- Losing a seat secret does not reclaim that username. A new join is a new player id, and the old name still blocks with `Username is already taken in this room`.

Room name: trimmed, non-blank, length 1–128. Blank → `Room name is required`.

Invite code:

- Generated length default **6**, allowed range **4–12**.
- Alphabet `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (no `I`, `O`, `0`, `1`).
- Lookup normalizes with trim + uppercase.
- Up to 10 generation attempts, then `Failed to generate a unique room code`.

Roles: `HOST`, `GUEST`, `SPECTATOR`. At most one host (the creator). At most one guest. Everyone else is a spectator. Members are ordered by join time.

### 2.2 Room status

`WAITING` → `LOBBY` → `IN_GAME` → `FINISHED`.

| Event | Result |
|---|---|
| Create | `WAITING`, creator is `HOST`, `ready=false`. No presence event. |
| First joiner while no guest exists | `GUEST`, status forced to `LOBBY`, presence `GUEST_JOINED`. |
| Join while a guest already exists | `SPECTATOR`. Status unchanged. No presence event. |
| Guest leaves and status is `LOBBY` and no guest remains | Remove seat, status `WAITING`, presence `GUEST_LEFT`. |
| Spectator leaves | Remove seat. Status unchanged. Presence `DISCONNECTED` (there is no spectator-left type). |
| Host leave | Rejected: `Host cannot leave the room`. Seat stays. |
| Both host and guest `ready=true` while `LOBBY` | Start the match, status `IN_GAME`, presence `GAME_STARTED`, then publish the initial game state. |
| A command sets `GameStatus.WON` | Room status `FINISHED`. |

`JoinRoom` does **not** read the current status. If the guest slot is empty, the joiner becomes guest and the room is set to `LOBBY` even when it was `IN_GAME`. A game record can still exist beside that lobby. Tests: `assignsGuestWhenSlotAvailable`, `assignsSpectatorWhenGuestTaken`, `guestCanLeaveLobbyAndAnotherGuestCanJoin`.

Ready:

- Only `HOST` or `GUEST`. A spectator gets `Not a member of this room`.
- Only while status is `LOBBY`. Otherwise `Room is not in lobby`.
- Body flag `ready` is boolean and required.
- One player ready publishes `PLAYER_READY` or `PLAYER_UNREADY` and does **not** start the game.
- Ready is **not** on the member list. Clients learn it only from presence.
- The response after start includes the game destination. It does not repeat the seat secret.
- A second start of the same room throws `Game already started`.

Tests: `publishesPlayerReadyWhenMarkedReady`, `publishesPlayerUnreadyWhenMarkedNotReady`, `readyRequiresSessionTokenAndDoesNotRepeatIt`.

### 2.3 Disconnect

Disconnect handling applies only to rooms where that connection subscribed to presence.

| Room status | Who | Effect |
|---|---|---|
| `IN_GAME` | Any member | Seat **kept**. Presence `DISCONNECTED` only. |
| `LOBBY` or `WAITING` | Guest | Full leave: `GUEST_LEFT`, slot freed, status may return to `WAITING`. |
| `LOBBY` or `WAITING` | Spectator | Full leave: removed, presence `DISCONNECTED`. |
| `LOBBY` or `WAITING` | Host | Leave is rejected; presence `DISCONNECTED` only. Host stays. |
| `FINISHED` | Any member | Treated like lobby: leave is attempted (host still cannot be removed). |

Tests: `inGameDisconnectKeepsMembership`, `lobbyDisconnectRemovesGuest`.

### 2.4 Presence payload

Fields: `type`, `playerId`, `username`, `role`.

Types: `PLAYER_CONNECTED`, `SPECTATOR_CONNECTED`, `DISCONNECTED`, `GUEST_JOINED`, `GUEST_LEFT`, `PLAYER_READY`, `PLAYER_UNREADY`, `GAME_STARTED`.

Subscribing to presence emits `PLAYER_CONNECTED` (host or guest) or `SPECTATOR_CONNECTED`. Each subscribe emits it again. There is no dedup.

`GAME_STARTED` uses the player id, name, and role of the ready call that completed the pair.

### 2.5 Chat

Two channels. Payload: `senderPlayerId`, `senderUsername`, `senderRole`, `text` (trimmed), `sentAt`.

| Channel | Who may send | Who may read |
|---|---|---|
| Player chat | Host and guest | Every member, including spectators |
| Spectator chat | Spectators only | Spectators only |

Empty or blank text → `Message text is required`. No maximum length. Chat is not stored; late joiners do not receive history.

Send denials:

- `Only players can send messages in player chat`
- `Only spectators can send messages in spectator chat`

There are no chat unit tests. The rules above come from `SendPlayerChatUseCase`, `SendRoomChatCommand`, and `RoomStompChannelInterceptor`.

### 2.6 Who may send game traffic

| Action | Who |
|---|---|
| Submit a command | Host or guest, and the room is `IN_GAME`. Otherwise `Only players can send game commands` or `Game is not in progress`. |
| Request a snapshot | Any member. If no game exists, the request is ignored. |
| Read game state | Any member. |

On subscribe to the game channel, if a game exists, that subscriber receives the current `GameStateView` once. If none exists, nothing is sent.

---

## 3. Shared game state

### 3.1 Fields both peers must store

| Field | Meaning |
|---|---|
| `gameId`, `roomId` | Identifiers |
| `version` | Starts at **0**. **+1** after every accepted command. |
| `status` | `IN_PROGRESS` or `WON` |
| `winnerPlayerId` | Set when `WON`, otherwise null |
| `blackPlayerId`, `whitePlayerId` | Host and guest |
| `activeColor` | Whose turn it is (`BLACK` or `WHITE`), except during Nemesis (see below) |
| `firstPlayerColor` | The random starter. Used only for second-player compensation. |
| `turnNumber` | Starts at **1**. Increments when a full turn ends. |
| `phase` | `ACTION` or `RECRUITMENT` |
| `recruitmentPhasesRemaining` | Starts at **1**. **2** on the second player's first turn. |
| `cellToPiece` | Cell id → piece id |
| `pieces` | Piece id → piece |
| `faceUpOffers` | Up to 3 recruit cards |
| `deck` | Remaining cards, order matters |
| `blackHand`, `whiteHand` | Cards in front of that player, **leader included** |
| `actedThisPhase` | Pieces that finished an action this action phase |
| `activeAbilityBlockedThisPhase` | Allies that cannot use an active ability for the rest of this action phase (Tactician) |
| `frogExpiresAfterOpponentTurn` | Piece id → turn number at which the frog flag clears |
| `resolvingNemesis` | Opponent must move Nemesis before anyone else acts |
| `pendingAbility` | Multi-step ability in progress |

`BoardPiece`: `id`, `type`, `owner`, `cellId`, `frog`.

`PendingAbility`: `pieceId`, `abilityId`, `step`, `prompt`.

`activeAbilityBlockedThisPhase` is stored in the persistence snapshot and used by the engine. It is **omitted** from `GameStateView`. A client that only mirrors the broadcast view will forget Tactician's block. The port must keep the field.

### 3.2 Wire view (`GameStateView`)

Camel-case JSON. Enums are their Java names (`WILL_O_THE_WISP`, `ACTIVE_ABILITY`, `BLACK`). Piece ids and player ids are UUID strings. Cell ids are numbers. `cellToPiece` keys are decimal strings in JSON objects.

View fields match the table above except `activeAbilityBlockedThisPhase`, plus `legalActions`.

`legalActions` is computed for the **current actor** (active player, or the Nemesis owner while `resolvingNemesis` is true) and sent to **every** subscriber, including spectators. It is an empty list outside `ACTION`, and when the game is `WON`.

`GameLegalAction`: `actionKey`, `type` (`DEFAULT_MOVE` or `ACTIVE_ABILITY`), `pieceId`, `targetCellId`, `targetPieceId`, `label` (the actor's `CharacterType` name), `choiceGroup`.

`pendingAbility` view: `pieceId`, `abilityId`, `step`, `prompt`.

Tests: `GameStateViewJsonSerializationTest` (camel-case, string piece ids, null `targetCellId` on acrobat step 1).

### 3.3 Commands

`GameCommandType`: `DEFAULT_MOVE`, `ACTIVE_ABILITY`, `END_ACTION_PHASE`, `RECRUIT`.

Request fields: `type`, `pieceId`, `targetCellId`, `offerIndex`, `abilityParams`, `actionKey`, `expectedVersion` (required).

Resolution order:

1. If `actionKey` is non-blank, decode it and **ignore** the other command fields.
2. Otherwise `type` is required (`type or actionKey is required`).
3. `abilityParams` null becomes an empty map.

`expectedVersion` must equal the current version. Mismatch → rejection `STALE_VERSION`, message `Stale game version`, `actualVersion` = current version. State does not change. A lost race on save uses message `Concurrent game update` (same code).

Rejected commands never mutate state. Rejection shape: `code`, `message`, `actualVersion` (only for `STALE_VERSION`).

| Code | When |
|---|---|
| `ILLEGAL_MOVE` | Rules rejection (`IllegalGameMoveException` message) |
| `STALE_VERSION` | Version mismatch |
| `GAME_NOT_FOUND` | No game for that room |
| `VALIDATION` | Missing `expectedVersion` or other bean validation |

Tests: `sendsIllegalMoveRejectionToSender`, `sendsStaleVersionWithActualVersion`, `ignoresWhenDestinationIsNotGameCommands`.

### 3.4 `actionKey`

UTF-8 payload, Base64 URL without padding:

```
v1|<TYPE>[|<pieceId>][|c=<cell>][|o=<offerIndex>][|p=<k:v,k:v>]
```

- Prefix must be `v1`. Otherwise `Invalid actionKey`. Blank key → `actionKey is required`.
- Numeric parameter values match `-?\d+` and decode as integers. Everything else stays a string.
- `targetCellId` on a legal-action view comes from the command's cell, else from params `targetCellId`. A legacy Royal Guard `secondCellId` is **not** copied onto `targetCellId`.
- `choiceGroup` is `CLAW:<targetPieceId>` when params contain both `mode` and `targetPieceId`. Otherwise null.

`END_ACTION_PHASE` and `RECRUIT` are valid commands and can be encoded, but **`legalActions` never lists them**. The client builds those two itself.

Tests: `roundTripsDefaultMove`, `roundTripsActiveAbility`, `legalActionExposesTargetCellFromAbilityParams`, `legalActionUsesFirstStepCellForLegacyRoyalGuardPayload`.

### 3.5 Opening state

`GameStateFactory.createInitial`, then `beginTurnIfNeeded` (so a sniper win can end the match before the first action, if a sniper were already on the board — it is not, at a normal start).

- `version=0`, `status=IN_PROGRESS`, `turnNumber=1`, `phase=ACTION`, `recruitmentPhasesRemaining=1`.
- `activeColor` and `firstPlayerColor` are the same random color (`nextBoolean`: black or white, equal chance).
- Each hand is `[LEADER]` only.
- One `LEADER` piece on each crown, `frog=false`. New random piece ids.
- Deck: every `CharacterType` except `LEADER`, shuffled (**21** cards). `HERMIT` and `CUB` are both in the deck. Hermit's recruit also places an extra cub that does not come from the deck, so two cubs can exist.
- Draw up to 3 offers from the front of the deck (`removeFirst`).
- There is **no** leader-type choice. `selected_leader` exists in an old migration and is unused. Both players always receive `CharacterType.LEADER`.

---

## 4. Board

37 cells. Axial `(q, r)`. For `r` from `-3` to `3`, `q` runs from `max(-3, -r-3)` to `min(3, -r+3)`. Ids `0..36` in that order. Row lengths top to bottom: **4, 5, 6, 7, 6, 5, 4**.

Six neighbor directions, in this order: `(1,0), (1,-1), (0,-1), (-1,0), (-1,1), (0,1)`.

Distance: `(abs(Δq)+abs(Δr)+abs(Δs))/2` with `s=-q-r`.

Straight line: same `q`, or same `r`, or same `q+r`.

`lineBetween` is inclusive. Empty if the cells are not on one straight line.

Visible / clear line: same straight line, and no occupant on cells **strictly between** the ends. Adjacent cells are visible.

A border cell has fewer than 6 neighbors.

### 4.1 Cell index

| id | q | r | notes |
|---:|---:|---:|---|
| 0 | 0 | -3 | WHITE crown |
| 1 | 1 | -3 | WHITE recruit |
| 2 | 2 | -3 | WHITE recruit |
| 3 | 3 | -3 | WHITE recruit |
| 4 | -1 | -2 | WHITE recruit |
| 5 | 0 | -2 | |
| 6 | 1 | -2 | |
| 7 | 2 | -2 | |
| 8 | 3 | -2 | |
| 9 | -2 | -1 | WHITE recruit |
| 10 | -1 | -1 | |
| 11 | 0 | -1 | |
| 12 | 1 | -1 | |
| 13 | 2 | -1 | |
| 14 | 3 | -1 | |
| 15 | -3 | 0 | WHITE recruit |
| 16 | -2 | 0 | |
| 17 | -1 | 0 | |
| 18 | 0 | 0 | center |
| 19 | 1 | 0 | |
| 20 | 2 | 0 | |
| 21 | 3 | 0 | BLACK recruit |
| 22 | -3 | 1 | |
| 23 | -2 | 1 | |
| 24 | -1 | 1 | |
| 25 | 0 | 1 | |
| 26 | 1 | 1 | |
| 27 | 2 | 1 | BLACK recruit |
| 28 | -3 | 2 | |
| 29 | -2 | 2 | |
| 30 | -1 | 2 | |
| 31 | 0 | 2 | |
| 32 | 1 | 2 | BLACK recruit |
| 33 | -3 | 3 | BLACK recruit |
| 34 | -2 | 3 | BLACK recruit |
| 35 | -1 | 3 | BLACK recruit |
| 36 | 0 | 3 | BLACK crown |

WHITE recruitment: `{1, 2, 3, 4, 9, 15}`.

BLACK recruitment: `{33, 34, 35, 32, 27, 21}`.

Crowns are not recruitment cells. Other border cells are not in either zone.

Tests: `has37Cells`, `recruitmentZonesMatchCanonicalCornerEdges`, `crownCellsAreNotRecruitmentCells`, `farBorderCellIsNotRecruitmentZone`.

Crown cells have **3** neighbors, not 6. Surround checks actual neighbors, so a leader still on its crown is surrounded when those 3 cells are all occupied.

---

## 5. Turn machine

`apply` refuses anything when status is not `IN_PROGRESS` (`Game is finished`).

Actor color is black if the player id equals `blackPlayerId`, white if it equals `whitePlayerId`, otherwise `Not a player in this game`.

If `resolvingNemesis` is true, the command is handled only by Nemesis resolution. The active-color check is skipped inside that path.

Otherwise the actor must equal `activeColor` (`Not your turn`).

### 5.1 Action phase

Each of the active player's pieces may complete **at most one** action. Order is free. Ending the phase early skips the rest.

A piece in `actedThisPhase` cannot act (`Piece already acted`).

While `pendingAbility` is set, only that piece's current step is legal (`Complete pending ability first`). Ending the phase clears the pending ability and marks that piece acted, so a partial Acrobat, Royal Guard, Vizier, or Manipulator step can be abandoned.

While `resolvingNemesis` is true, nobody except the Nemesis owner may act, and only with a Nemesis move.

Default move, for a piece that `allowsDefaultMove`:

- Frog: any **empty** cell at distance **1 or 2**. The path may be occupied. The landing does not have to be on a straight line. Farther → `Frog move too far`.
- Leader: see Vizier below.
- Everyone else: one adjacent empty cell. Otherwise `Illegal default move`.

`allowsDefaultMove` is false for `NEMESIS` and `WILL_O_THE_WISP` (`Piece cannot default move`). Frog does not disable the default move; it changes the path rule. A frogged piece cannot use an active ability (`Frogged piece cannot use active abilities`).

The message `Frog already acted` is unreachable: the `actedThisPhase` check throws `Piece already acted` first.

### 5.2 Ending the action phase

`END_ACTION_PHASE` requires `ACTION` (`Not in action phase`).

It clears `actedThisPhase`, `activeAbilityBlockedThisPhase`, and `pendingAbility`, and sets phase to `RECRUITMENT`.

Then, if the hand size is **≥ 5** or no face-up offer is legally placeable, it immediately consumes **one** recruitment phase (`finishRecruitmentPhase`). It does not loop. If `recruitmentPhasesRemaining` was 2, the player is left in `RECRUITMENT` with 1 phase left. There is no separate "skip recruitment" command. A full hand in that leftover phase makes `RECRUIT` throw `Hand full`.

### 5.3 Recruitment

`RECRUIT` requires phase `RECRUITMENT` (`Not in recruitment phase`).

Requires `offerIndex` and `targetCellId` (`Invalid recruit command`). Index must address `faceUpOffers` (`Invalid offer index`).

Hand size ≥ 5 → `Hand full`. The leader card counts.

Placement cell must be in **that player's** recruitment zone (`Not a recruitment zone cell`) and empty (`Cell occupied` / `Cell off board`).

On success:

1. Remove that offer.
2. Draw from the front of the deck until 3 offers remain, or the deck is empty. Offers may stay below 3.
3. Place a new piece of the offered type on the cell. New piece id. Add that type to the hand.
4. If the offer is `HERMIT`, also place `CUB` (see Hermit).
5. Consume one recruitment phase.

An offer is legal when at least one empty zone cell exists. For `HERMIT`, `canRecruitOffer` also requires fewer than 4 non-leader cards **before** the recruit, and an empty recruitment neighbor of the hermit cell for the cub. See the hermit off-by-one in [Engine vs written rules](#engine-vs-written-rules).

### 5.4 Second-player compensation

When a full turn ends, the next player gets `recruitmentPhasesRemaining=2` only when **both** are true:

- `nextTurn == 2`
- `nextColor != firstPlayerColor`

That is the second player's first turn only: Action, then two recruitment phases. The first player always has one.

### 5.5 End of a full turn

`endFullTurn`, in order:

1. Active player's leader must be safe. If captured or surrounded → throw `Move would leave your leader captured or surrounded`. This throw happens **before** the opponent-capture win check, so you cannot finish a turn that leaves your own leader unsafe in order to capture theirs.
2. If the **opponent** leader is captured or surrounded → active player wins (`WON`, `winnerPlayerId` = active player).
3. Switch `activeColor` to the opponent, `turnNumber += 1`, phase `ACTION`, clear acted / ability-blocked / pending, set recruitment count (1 or 2).
4. Expire frogs whose stored turn ≤ the new turn number.
5. `beginTurnIfNeeded`: if the new active player has a sniper win, the match ends immediately. Otherwise expire frogs again (no-op if step 4 already did).

Sniper is **not** checked in the middle of a turn. Capture and surround of the opponent are **not** checked in the middle of the action phase.

Exception: `applyRecruit` calls `finishRecruitmentPhase` first. If that returns `WON`, it returns immediately and does **not** run the post-recruit leader-safety comparison. Test: `winningRecruitmentDoesNotThrowLeaderSafety`.

If a recruit does not win, leader safety compares the **pre-recruit** state to the state after the phase advance. A move that leaves the leader unsafe is rejected when the leader was safe before it. A move is allowed when the leader was **already** unsafe before it. Test: `leaderAlreadyInCaptureStillAllowsUnrelatedWandererTeleports`, `leaderSafetyBlocksTeleportThatNewlyExposesLeaderToCapture`.

---

## 6. Win, capture, surround

### 6.1 Sniper, at the start of the sniper owner's turn

The active player wins immediately when they have a `SNIPER` and the enemy leader is on the same straight line at distance **≥ 3**. Visibility is not required. Distance 2 does not win.

`findPieceOfType` returns the first matching piece in map iteration order. A second sniper is ignored.

Tests: `sniperWinsAtThreeOrMoreOnStraightLine`, `sniperDoesNotWinAtDistanceTwo`, `sniperWinAtTurnStartBeforeActionPhase`.

### 6.2 Captured

A missing leader counts as captured.

Otherwise:

1. Count enemy pieces that are allowed to capture.
2. If the count is **≥ 2**, the leader is captured.
3. Else if an enemy `ASSASSIN` is adjacent, the leader is captured with no second captor.

A piece does not count when `frog` is true, or its type is `WILL_O_THE_WISP` or `CUB`.

Standard captor: enemy, not an archer, on a neighbor cell of the leader.

Archer: counts only when **all** of these hold:

- not adjacent to the leader
- same straight line
- distance **exactly 2**
- **visible** (no occupant strictly between)

An adjacent archer does not count as a standard neighbor either. An archer is one captor; a second captor is still required.

Tests: `leaderCapturedWithTwoAdjacentEnemies`, `cubAndWispAndFrogDoNotCountAsCaptors`, `assassinAdjacentCapturesWithoutSecondCaptor`, `archerAtDistanceTwoCountsAsOneCaptorStillNeedsSecond`, `adjacentArcherDoesNotHelpCapture`.

### 6.3 Surrounded

Every neighbor cell of the leader is occupied. Owner and type do not matter. One empty neighbor prevents it. A missing leader counts as surrounded.

Tests: `leaderSurroundedWhenAllNeighborsOccupied`, `leaderNotSurroundedWithOneEmptyNeighbor`, `surroundEndsGameAtEndOfTurn`, `captureEndsGameWhenActionPhaseEndsWithFullHand`, `captureDoesNotEndGameMidActionPhase`.

### 6.4 After Nemesis

Both leaders are checked, **active player first**:

- Active leader captured or surrounded → **opponent** wins.
- Else opponent leader captured or surrounded → **active** player wins.

If both leaders are down, the opponent wins, because the active leader is checked first.

Nemesis itself does not apply leader safety (the `nemesisResolution` flag skips it). That is the only time a player may complete a move that newly endangers their own leader.

---

## 7. Global ability gates

Checked before a character's own active ability, in order:

| Check | Message |
|---|---|
| Not action phase | `Not in action phase` |
| Missing piece | piece-not-found path inside `requirePiece` |
| Not your piece | `Not your piece` |
| Already acted | `Piece already acted` |
| Piece is a frog | `Frogged piece cannot use active abilities` |
| Tactician blocked this piece | `Active ability blocked this turn` |
| Enemy `JAILOR` on a neighbor cell | `Jailor blocks active abilities` |
| Some other piece has `pendingAbility` | `Complete pending ability first` |

Jailor blocks **active** abilities only. Default moves still work. A friendly jailor does not block. Test: `jailorAdjacentSuppressesActiveAbility`.

Protector: an enemy ability that **moves an enemy piece** throws `Protector blocks this move` when the target is an enemy `PROTECTOR`, or any friendly `PROTECTOR` of that target is adjacent to the target. Same-owner targets are not protected (Illusionist may swap an ally). Protector does not block default moves, self-moves (Rider, Wanderer, Acrobat, Royal Guard, Claw advance), Shaman's frog, or Tactician/Brewmaster moving their own ally.

Test: `protectorBlocksEnemyManipulatorMove`.

Shared param errors: `targetCellId is required`, `targetPieceId is required`, `Cell off board`, `Cell occupied`, `Cells not adjacent`, `Enemy leader not found`, `Leader missing`.

---

## 8. Characters

Ability ids that appear in `pendingAbility`:

| Id | Used by |
|---|---|
| `LEADER_VIZIER` | Leader's extra step |
| `ACROBAT` | Second jump |
| `ROYAL_GUARD` | Optional second step |
| `MANIPULATOR` | Direction step. `prompt` is the target piece UUID string. |

Passive-only types throw `<TYPE> has no active ability` (for example `SNIPER has no active ability`). Leader throws `Leader has no active ability`. Nemesis throws `Nemesis cannot use active abilities`.

### 8.1 LEADER

Default move only, unless Vizier applies.

Without Vizier: adjacent empty cells.

With Vizier in **hand or on the board** (`playerHasVizier`): also any empty cell at distance **exactly 2** that is reached through an **empty** adjacent midpoint, excluding the start cell and excluding cells already adjacent to the start. The two-hex landing does **not** have to be on a straight line. A single command that lands on such a cell marks the leader acted and does **not** open a pending step.

A one-hex default move while Vizier is available does **not** mark the leader acted. It sets `pendingAbility(LEADER_VIZIER, step=1, prompt="Vizier step")`. The follow-up is a `DEFAULT_MOVE` to an adjacent empty cell only (no second two-hex jump). That follow-up clears pending and marks the leader acted.

Any leader move, including the first hex of a Vizier step, can start Nemesis resolution. `apply` checks `resolvingNemesis` **before** pending abilities, so the Nemesis owner moves while the Vizier step is still pending. The pending step remains after Nemesis resolves.

Leader safety runs on both the first and second step. Nemesis can interrupt between them.

Tests: `leaderHasDefaultMoveWithTargetCell`, `leaderWithVizierMayHaveExtendedDefaultMove`, `vizierExtendedMoveDoesNotIncludeReturnToStartOrDistanceOneViaTwoSteps`, `duringPendingVizierStepOnlyAdjacentMovesNotTwoHexVizierJump`, `afterLeaderSecondMoveWithVizierNoFurtherVizierOrDefaultMoves`, `afterLeaderDefaultMoveWithVizierNoFurtherLeaderMoves`.

### 8.2 SHAMAN

Active. Params: `targetPieceId`.

Target must be an enemy non-leader on a visible straight line (adjacent counts). Then `frog=true` and `frogExpiresAfterOpponentTurn[target] = turnNumber + 1`. Shaman is marked acted.

Messages: `Cannot frog the leader`, `Target must be enemy`, `Target not visible`.

Frog movement is the distance-≤2 rule in [Action phase](#51-action-phase). A frog never counts as a captor. If that piece had already acted, it cannot act again as a frog.

Expiry, as implemented: `expireFrogs` clears the flag when the stored turn is **≤ `turnNumber`**. `endFullTurn` increments the turn and then expires. A frog applied on turn N therefore clears at the **start** of turn N+1, before the opponent acts. It does not last through the opponent's turn. No test covers the timer. See [Engine vs written rules](#engine-vs-written-rules).

Test: `shamanHasVisibleLineActiveAbility`, `froggedPieceHasNoActiveAbilityCandidates`.

### 8.3 SNIPER

Passive only. Default move. Win condition in [Sniper](#61-sniper-at-the-start-of-the-sniper-owners-turn).

Test: `sniperHasDefaultMoveOnly`.

### 8.4 TACTICIAN

Active. Requires some ally (any of your pieces, including the tactician or the leader) adjacent to the enemy leader. Otherwise `An ally must be adjacent to the enemy leader`.

Params: `targetPieceId` (non-leader ally; `Must move non-leader ally`), `targetCellId` (empty and adjacent to that ally).

Moves the ally one step. That ally is added to `activeAbilityBlockedThisPhase` and cannot use an **active** ability for the rest of this action phase. They can still default-move. The tactician is marked acted. The block clears when the action phase ends.

Test: `tacticianHasActiveAbilityWithTargets`, `tacticianMayMoveDistantAllyWhenAnotherAllyPinsEnemyLeader`.

### 8.5 WILL_O_THE_WISP

No default move. Active: `targetCellId` any empty cell, including cells adjacent to enemies. Mark acted. Never a captor, even when not a frog.

Tests: `willOWispHasTeleportOnly`, `willOWispHasTeleportOnlyNotDefaultMove`.

### 8.6 ACROBAT

Active, up to two jumps. Still has a normal default move if the player chooses that instead.

A jump is params `targetPieceId` = the piece jumped **over**. That cell must be occupied. Landing is the unique cell that makes a 3-cell straight line `from → over → landing`. Landing must be empty and on the board.

Messages: `Must jump over occupied cell`, `Acrobat jump must be exactly over one adjacent character`, `Landing must be empty`, `Another ability is pending`, `No acrobat jump to complete`.

First jump: if another legal jump exists from the landing, set `pendingAbility(ACROBAT, step=1, prompt="Second jump")` and do **not** mark acted. If no second jump exists, mark acted immediately.

Second jump: same params, clear pending, mark acted. The second jump may use a different direction. Each jump still crosses exactly one adjacent character.

Skip the second jump: params `completeAcrobat: true`. Clears pending and marks acted.

While pending, `legalActions` contains only second-jump targets and the complete action.

The first-step legal action carries `targetPieceId` and a null `targetCellId`.

Tests: `acrobatHasJumpActiveAbility`, `initialStepListsJumpTargetsByPieceIdOnly`, `afterFirstJumpPendingStepListsSecondJumpTargetsByPieceId`, `pendingAcrobatOffersOnlySecondJumpOrComplete`, `acrobatLegalActionsSerializeTargetPieceIdOnlyOnFirstStep`.

### 8.7 RIDER

Active. `targetCellId` at distance **exactly 2** on a straight line. Every cell on that line except the origin must be empty, including the destination.

Messages: `Rider moves 2 in a straight line`, `Path must be clear`.

Test: `riderHasTwoStepActiveAbility`.

### 8.8 BRUISER

Active. Params: `targetPieceId` (adjacent enemy; `Must target enemy`), `targetCellId` (push destination).

Protector is checked on the enemy.

Push cells: from the enemy, take the direction toward the bruiser, then the three directions `(dir+2) % 6`, `(dir+3) % 6`, `(dir+4) % 6`. Drop cells off the board or occupied. The bruiser's own side is not a push option. A border enemy can have fewer than three.

Resolution: move the enemy onto the push cell, then move the bruiser onto the enemy's old cell. Both cells stay indexed. Mark the bruiser acted.

Messages: `Protector blocks this move`, `Push cell off board`, `Push must be adjacent to enemy`, `Push must be to opposite hex adjacent to enemy`.

Tests: `bruiserHasPushActiveAbility`, `oppositeHexesAreAtMostThreeAndExcludeBruiserSide`, `legalActionsMatchEmptyOppositeCellsOnly`, `rejectsPushToLateralNeighborWhenEmpty`, `multipleAdjacentEnemiesEachGetOwnPushOptions`, `occupiedOppositeCellsAreOmitted`, `boardBorderMayOfferFewerThanThreePushes`, `applyPushPlacesBruiserOnFormerEnemyCellAndEnemyOnPushDestination`, `applyPushDoesNotDropBruiserFromCellIndex`.

### 8.9 ROYAL GUARD

Active. The guard may start anywhere.

First step: `targetCellId` must be an **empty neighbor of your leader**, not necessarily a neighbor of the guard. Message: `Must move adjacent to leader first`.

If params also contain numeric `secondCellId` (legacy one-shot): that cell must be empty and adjacent to the first cell. Both steps happen, and the guard is marked acted. No pending state. The legal-action view still exposes only the first cell as `targetCellId`.

Otherwise, if an optional second step exists, set `pendingAbility(ROYAL_GUARD, step=1, prompt="Optional step")`. Second-step cells are empty neighbors of the guard **except the leader's cell**. Message: `Illegal royal guard second step`.

If no second step exists after the first move, mark acted immediately.

`completeRoyalGuard: true` during pending clears it and marks acted (`No royal guard step to complete`).

Tests: `royalGuardHasLeaderAdjacentActiveAbility`, `initialActiveAbilityHighlightsLeaderAdjacentEmptyCells`, `guardOffLeaderRingStillGetsLeaderAdjacentHighlights`, `afterFirstStepPendingOffersSecondStepOrComplete`, `completeAfterFirstStepWithoutSecondMove`, `legacyOneShotTwoStepStillApplies`.

### 8.10 ILLUSIONIST

Active. Params: `targetPieceId`.

Target may be enemy **or ally**. Not the illusionist. Not adjacent (`Target must not be adjacent`). Must be visible (`Target not visible`). Protector applies only to enemy targets.

Swaps the two cells. Mark acted.

Test: `illusionistHasSwapActiveAbility`.

### 8.11 CLAW LAUNCHER

Active. Params: `targetPieceId`, `targetCellId`, `mode` (`advance` default, or `drag`). Target must be visible (`Target not visible`).

`choiceGroup` is `CLAW:<targetPieceId>`.

**Advance:** move the claw to the cell on the line immediately before the target (`line[size-2]`). That cell must be empty. Any other cell → `Invalid advance cell`. The target does not move. If the target is already adjacent, the only "advance" cell is the claw's own cell, which is occupied, so advance is unavailable.

**Drag:** move the **target** to `line[1]`, the cell immediately adjacent to the claw, on the line toward the target. The claw does not move. The line must have at least 3 cells (target is not adjacent). Cells strictly between the claw and the target, other than the destination, must be empty. Protector applies. Any other destination → `Invalid drag destination`.

This is one action that pulls the target the full distance, not a one-step nudge.

Test: `clawLauncherHasAdvanceOrDragChoiceGroup`.

### 8.12 MANIPULATOR

Active, two steps. Enemy only.

Step 1: `targetPieceId` and **no** `targetCellId`. Validates the target and sets `pendingAbility(MANIPULATOR, step=0, prompt=<target uuid>)`. The manipulator is not yet marked acted. Nothing moves.

A legal target is an enemy, not adjacent, visible, not protector-blocked, with at least one empty one-step destination on the line.

Step 2: same `targetPieceId` plus `targetCellId`. Destinations are the line cell one step **toward** the manipulator and one step **away**, each only if empty and on the board. Then clear pending and mark the manipulator acted.

A single command that already includes `targetCellId` skips the pending state and moves immediately.

Messages: `Target mismatch`, `Must target enemy`, `Target must not be adjacent`, `Target not visible`, `Target cannot be moved`, `Destination must be on line to target`, `Target not on line`, `Manipulator may only move target one step on the line`, `Protector blocks this move`.

Tests: `manipulatorHasLineMoveActiveAbility`, `initialStepListsEnemyTargetsByPieceIdOnly`, `afterTargetSelectedPendingStepListsDestinationCells`, `blockedLineEnemyBehindCloserEnemyIsNotLegalTarget`, `adjacentEnemyOnLineIsNotLegalTarget`, `manipulatorLegalActionsSerializeTargetPieceIdAndDestinationCell`.

### 8.13 WANDERER

Active. `targetCellId`: any empty cell that is **not** adjacent to any enemy. Adjacent to allies is allowed. The wanderer's current cell is occupied, so it is not a destination.

Message: `Cannot land adjacent to enemy`.

Jailor and leader safety apply as global gates.

Tests: `wandererHasNonAdjacentEnemyActiveAbility`, `legalActionsMatchNonEnemyAdjacentEmptyCells`, `excludesEmptyHexesAdjacentToEnemy`, `allowsEmptyHexAdjacentToAllyButNotEnemy`, `applyTeleportMovesWandererToChosenEmptyCell`, plus the jailor and leader-safety tests named above.

### 8.14 BREWMASTER

Active. Params: `targetPieceId` (any ally, **including the leader**; `Must move ally`), `targetCellId` (empty and adjacent to that ally). The ally must be adjacent to the brewmaster. Mark the brewmaster acted. The ally is not marked acted and is not ability-blocked.

Test: `brewmasterHasAllyMoveActiveAbility`.

### 8.15 ARCHER

Passive. Default move only. Capture helper in [Captured](#62-captured). The engine requires visibility; an adjacent archer never helps.

Test: `passiveCharactersHaveDefaultMoveOnly` (also covers Assassin, Jailor, Protector, Vizier, Hermit, Cub).

### 8.16 ASSASSIN

Passive. Default move only. Adjacent to the enemy leader captures alone, checked at end of turn and after Nemesis, not mid-action.

### 8.17 JAILOR

Passive. Default move only. See [Global ability gates](#7-global-ability-gates).

### 8.18 PROTECTOR

Passive. Default move only. See [Global ability gates](#7-global-ability-gates).

### 8.19 VIZIER

Passive. Default move only. The effect is on the leader; see [LEADER](#81-leader). "In play" means the `VIZIER` card is in the hand **or** a vizier piece of that color is on the board.

### 8.20 NEMESIS

No voluntary action during its owner's action phase. `legalActions` is empty for it then. Test: `nemesisHasNoVoluntaryActions`.

When the **enemy leader's cell changes** (default move, including a Vizier step), and the opponent has a `NEMESIS` with at least one legal landing, set `resolvingNemesis=true`. If no landing is legal, do not enter resolution.

During resolution:

- Only `DEFAULT_MOVE`. Otherwise `Nemesis resolution requires a move command`.
- Only the Nemesis owner's player id. The active-color player gets `Only Nemesis owner may move during Nemesis resolution`. `activeColor` does **not** change.
- The piece must be that owner's Nemesis (`Must move your Nemesis`, `Not Nemesis`).
- Landing: distance **exactly 2**, straight line, different cell (`Nemesis must move to a different cell`, `Nemesis moves 2 in a straight line`), path including destination empty (`Path must be clear`). Same geometry as Rider.
- Leader safety is skipped for this move.
- Then clear `resolvingNemesis` and run [After Nemesis](#64-after-nemesis).

`legalActions` during this flag lists only those Nemesis moves, labeled `NEMESIS`.

Tests: `enemyLeaderMoveTriggersNemesisResolutionForOpponent`, `activePlayerCannotMoveWhileNemesisResolutionPending`.

### 8.21 HERMIT and CUB

Both are passive on the board (default move only). Cub never captures.

Recruiting the `HERMIT` offer also places a `CUB`:

- Cub cell = the **first** neighbor id, in topology neighbor order, that is an empty cell in the **same** recruitment zone. The player does not choose the cub cell.
- No such cell → `No cub placement available`.
- Cub is added to the hand and the board. New piece id.

Hand check inside `recruitCubPair` runs **after** the hermit is already in the hand. It throws `Hermit recruitment not allowed` when non-leader cards in the hand are **≥ 4** at that moment. Combined with the earlier "hand ≥ 5" check, a successful hermit+cub recruit requires the hand, before the command, to contain the leader and at most **2** other cards (after hermit the non-leader count is 3, which is allowed; cub makes 4 non-leaders + leader = 5).

`canRecruitOffer` uses the **pre-recruit** non-leader count and allows 3. It can therefore treat hermit as a legal offer when `apply` will throw. If hermit is the only face-up card in that state, ending the action phase will **not** skip recruitment, and `RECRUIT` will throw. There is no other skip command.

On the board, Hermit and Cub each get their own action. Each may act at most once per action phase. Nothing forces them to act together.

---

## 9. Legal actions

Computed only when `status=IN_PROGRESS` and `phase=ACTION`. Each candidate is simulated with `GameRulesEngine.apply`. Anything that throws is dropped. Duplicate `actionKey`s are dropped.

Order of gates:

1. If `resolvingNemesis`: Nemesis moves only, acting as the opponent player id. Return.
2. If `pendingAbility`: only that step's candidates. Return.
3. Otherwise, for each of the active player's pieces not in `actedThisPhase`:
   - default-move candidates, unless a pending step is already attached to that piece
   - skip actives when the piece is a frog
   - skip actives when the piece is in `activeAbilityBlockedThisPhase`
   - skip actives when an enemy jailor is adjacent
   - else that type's active candidates

Pending-step catalogs:

| Pending id | Candidates |
|---|---|
| `ACROBAT` | Second jumps, plus one command with `completeAcrobat: true` |
| `LEADER_VIZIER` | Leader `DEFAULT_MOVE` to each adjacent empty cell |
| `ROYAL_GUARD` | Second-step cells, plus `completeRoyalGuard: true` |
| `MANIPULATOR` | Destinations for the piece id stored in `prompt` |

Default-move catalogs follow [Action phase](#51-action-phase): frog distance ≤ 2, leader via `leaderDefaultMoveDestinations`, others adjacent empty.

Not included: `END_ACTION_PHASE`, `RECRUIT`, recruitment cells, offer indexes.

`label` is the acting piece's type name, including during Nemesis and during a leader Vizier step.

Tests: `includesDefaultMovesForActiveLeaderAtTurnStart`, plus the per-character legal-action tests listed under each character.

---

## 10. Rejection message catalog

These strings are the `ILLEGAL_MOVE` message. The client should keep them if it surfaces the same errors.

**Turn and phase**

`Game is finished`, `Not your turn`, `Not a player in this game`, `Not in action phase`, `Not in recruitment phase`, `Complete pending ability first`, `Another ability is pending`.

**Piece and move**

`Invalid move command`, `Not your piece`, `Piece already acted`, `Piece cannot default move`, `Illegal default move`, `Frog move too far`, `Frogged piece cannot use active abilities`, `Active ability blocked this turn`, `Jailor blocks active abilities`, `Cell off board`, `Cell occupied`, `Cells not adjacent`, `Move would leave your leader captured or surrounded`.

**Recruit**

`Hand full`, `Invalid recruit command`, `Invalid offer index`, `Not a recruitment zone cell`, `Hermit recruitment not allowed`, `No cub placement available`.

**Nemesis**

`Nemesis resolution requires a move command`, `Only Nemesis owner may move during Nemesis resolution`, `Must move your Nemesis`, `Not Nemesis`, `Nemesis must move to a different cell`, `Nemesis moves 2 in a straight line`, `Path must be clear`, `Nemesis cannot use active abilities`.

**Abilities**

`Leader has no active ability`, `<TYPE> has no active ability`, `targetCellId is required`, `targetPieceId is required`, `Cannot frog the leader`, `Target must be enemy`, `Target not visible`, `An ally must be adjacent to the enemy leader`, `Must move non-leader ally`, `Enemy leader not found`, `Leader missing`, `Must jump over occupied cell`, `Acrobat jump must be exactly over one adjacent character`, `Landing must be empty`, `No acrobat jump to complete`, `Rider moves 2 in a straight line`, `Must target enemy`, `Protector blocks this move`, `Push cell off board`, `Push must be adjacent to enemy`, `Push must be to opposite hex adjacent to enemy`, `Must move adjacent to leader first`, `Illegal royal guard second step`, `No royal guard step to complete`, `Target must not be adjacent`, `Invalid advance cell`, `Invalid drag destination`, `Target mismatch`, `Target cannot be moved`, `Destination must be on line to target`, `Target not on line`, `Manipulator may only move target one step on the line`, `Cannot land adjacent to enemy`, `Must move ally`, `Not a leader`, `No rules for <type>`.

**Command encoding**

`type or actionKey is required`, `actionKey is required`, `Invalid actionKey`.

**Version**

`Stale game version` (`STALE_VERSION`), `Concurrent game update` (`STALE_VERSION`).

---

## 11. Engine vs written rules

The design note describes the board game. The engine is what ships. Port the engine.

| Topic | Written note | Implemented behavior |
|---|---|---|
| Archer capture | May help even when not visible | Distance 2, not adjacent, **and visible** |
| Frog duration | Lasts through the opponent's full turn, then clears before your next turn | Stored as `turnNumber+1` and cleared when the turn counter reaches that value, which is the **start** of the opponent's turn |
| Claw drag | Pull until adjacent | Does that in one action: target moves to the cell next to the claw (`line[1]`), path between must be empty |
| Hermit hand limit | Fewer than 4 non-leader cards | `canRecruitOffer` allows 3 non-leaders before the recruit. `recruitCubPair` counts **after** the hermit is added and rejects ≥ 4, so a successful recruit needs ≤ 2 non-leaders beforehand |
| Cub placement | Place both figures | Cub cell is the first empty recruitment neighbor in direction-array order. Not a player choice |
| Leader setup | Each player selects a leader type | Always generic `LEADER`. No selection |
| Vizier extra step | One additional empty step | A one-step move opens a pending adjacent step. A single command may also jump to a distance-2 cell through an empty midpoint, and that cell need not be collinear |
| Frog path | Up to 2 spaces, may pass through occupied cells | Any empty cell at hex distance 1 or 2, not only straight lines |
| Brewmaster | Move an adjacent ally | The ally may be the leader |
| Illusionist | Swap with a visible non-adjacent character | Ally or enemy. Protector only blocks enemies |
| Sniper | If the condition is true | Only the first sniper of that color in piece-map order is inspected |
| Second recruitment when it must be skipped | Skip recruitment | `END_ACTION_PHASE` consumes only one skipped phase. A second phase with a full hand or no legal offer has no skip command |
| Legal moves during recruitment | Choose a legal face-up card | `legalActions` is empty in `RECRUITMENT`. The client must know `RECRUIT` and `END_ACTION_PHASE` on its own |
| Tactician block on the wire | — | `activeAbilityBlockedThisPhase` is not in `GameStateView` |

---

## 12. Consensus the peers have to replace

The server is the only writer of game state today. `SubmitGameCommandUseCase` loads state, checks `expectedVersion`, runs `apply`, and on `WON` marks the room finished, then saves version `expectedVersion+1` and broadcasts the new view.

For two clients, pick one authority model and keep these invariants:

- Both peers apply the same command to the same version and get the same next state, including generated piece ids on recruit.
- A command with the wrong version is ignored and the sender is told the real version.
- A rejected command does not bump the version and does not broadcast a new state.
- An accepted command bumps the version by 1 and every member, including spectators, observes the same view.
- `legalActions` in that view match `LegalActionsResolver` for that state.
- Opening randomness (first player, deck order, piece ids) is agreed once, before the first command.
- In `IN_GAME`, a dropped connection does not free the seat. In the lobby, a dropped guest frees the guest slot.

Move log: each accepted command is appended with the new version, the acting player id, and the command payload. The log is not required to play, but it is the current audit trail.

---

## 13. Test checklist

Port tests should keep these names' assertions. Paths are under `src/test/java/org/luyys/template/`.

### Lobby

| Test | Locks |
|---|---|
| `room/application/CreateRoomUseCaseTests.createsRoomWithHostParticipant` | New room is `WAITING`, creator is `HOST`, raw token is not what is stored |
| `room/application/JoinRoomUseCaseTests.assignsGuestWhenSlotAvailable` | First joiner is guest, status `LOBBY`, presence published |
| `JoinRoomUseCaseTests.assignsSpectatorWhenGuestTaken` | Second joiner is spectator, status and presence unchanged |
| `JoinRoomUseCaseTests.rejectsDuplicateUsername` | Duplicate name throws, nothing is saved |
| `JoinRoomUseCaseTests.throwsWhenRoomMissing` | Unknown code |
| `JoinRoomUseCaseTests.notifiesGuestJoinedWithGuestDetails` | `GUEST_JOINED` carries that guest's id and name |
| `JoinRoomUseCaseTests.joinReturnsAllRoomMembersWithUsernamesAndRoles` | Roster is usernames and roles |
| `room/application/LeaveRoomUseCaseTests.guestLeaveFreesSlotAndRevertsLobbyToWaiting` | Guest leave → `WAITING` and `GUEST_LEFT` |
| `LeaveRoomUseCaseTests.spectatorLeaveRemovesMembershipWithoutStatusChange` | Spectator leave does not change status |
| `LeaveRoomUseCaseTests.hostCannotLeave` | Host leave throws, seat remains |
| `LeaveRoomUseCaseTests.throwsWhenNotMember` / `throwsWhenRoomMissing` | Not a member, unknown room |
| `room/application/SetPlayerReadyUseCaseTests.publishesPlayerReadyWhenMarkedReady` | Ready event, game not started |
| `SetPlayerReadyUseCaseTests.publishesPlayerUnreadyWhenMarkedNotReady` | Unready event |
| `room/adapter/in/web/RoomControllerTests.hostGuestAndSpectatorFlow` | Full role flow and duplicate join |
| `RoomControllerTests.guestCanLeaveLobbyAndAnotherGuestCanJoin` | Guest slot can be taken again; old name can rejoin as spectator |
| `RoomControllerTests.joinReturnsUsernamesAndRolesOfExistingRoomActors` | Roster grows 2 then 3 |
| `RoomControllerTests.joinUnknownRoomReturnsNotFound` | Unknown join |
| `RoomControllerTests.readyRequiresSessionTokenAndDoesNotRepeatIt` | Ready requires the seat secret and does not echo it |
| `room/adapter/config/RoomDisconnectListenerTest.inGameDisconnectKeepsMembership` | In-game drop keeps the seat |
| `RoomDisconnectListenerTest.lobbyDisconnectRemovesGuest` | Lobby drop removes the guest |
| `room/adapter/config/RoomStompChannelInterceptorTest.guestCanSubscribeToGameTopic` | Players may receive game state |
| `RoomStompChannelInterceptorTest.guestCanSubscribeToUserCommandResultQueue` | Private rejection channel is not room-gated |
| `RoomStompChannelInterceptorTest.guestCanSendGameSnapshotRequest` | A member may request a snapshot |
| `RoomStompChannelInterceptorTest.guestAppPrefixedSnapshotSendIsAllowed` | App-prefixed snapshot destination is the same permission |
| `room/adapter/config/RoomDestinationsTest.isRoomTopicDestinationMatchesBrokerTopicsOnly` | Only broker topics count as room subscriptions |
| `RoomDestinationsTest.extractChannelUsesFirstSegmentAfterRoomCode` | Channel name is the segment after the code |

### Board, capture, wins

| Test | Locks |
|---|---|
| `game/domain/service/BoardTopologyTests.has37Cells` | 37 cells |
| `BoardTopologyTests.recruitmentZonesMatchCanonicalCornerEdges` | The two zone id sets |
| `BoardTopologyTests.crownCellsAreNotRecruitmentCells` | Crowns excluded |
| `BoardTopologyTests.farBorderCellIsNotRecruitmentZone` | Other border cells excluded |
| `CaptureEvaluatorTest.leaderCapturedWithTwoAdjacentEnemies` | Two adjacent captors |
| `CaptureEvaluatorTest.cubAndWispAndFrogDoNotCountAsCaptors` | Cub, wisp, and a frogged bruiser do not count |
| `CaptureEvaluatorTest.assassinAdjacentCapturesWithoutSecondCaptor` | Assassin alone |
| `CaptureEvaluatorTest.archerAtDistanceTwoCountsAsOneCaptorStillNeedsSecond` | Archer is one captor |
| `CaptureEvaluatorTest.adjacentArcherDoesNotHelpCapture` | Adjacent archer is ignored |
| `CaptureEvaluatorTest.leaderSurroundedWhenAllNeighborsOccupied` | Full ring |
| `CaptureEvaluatorTest.leaderNotSurroundedWithOneEmptyNeighbor` | One empty hex saves the leader |
| `CaptureEvaluatorTest.sniperWinsAtThreeOrMoreOnStraightLine` | Distance ≥ 3 at turn start |
| `CaptureEvaluatorTest.sniperDoesNotWinAtDistanceTwo` | Distance 2 is not a sniper win |
| `GameRulesEngineWinTest.captureEndsGameWhenActionPhaseEndsWithFullHand` | Capture is applied when the action phase ends |
| `GameRulesEngineWinTest.captureDoesNotEndGameMidActionPhase` | Two adjacent enemies do not win before the phase ends |
| `GameRulesEngineWinTest.sniperWinAtTurnStartBeforeActionPhase` | `beginTurnIfNeeded` can end the match |
| `GameRulesEngineWinTest.surroundEndsGameAtEndOfTurn` | Surround wins at phase end |
| `GameRulesEngineWinTest.winningRecruitmentDoesNotThrowLeaderSafety` | A winning recruit is returned as `WON` |
| `GameRulesEngineTests.rejectsMoveWhenNotYourTurn` | Wrong player |

### Nemesis and legal-action edges

| Test | Locks |
|---|---|
| `NemesisResolutionTest.enemyLeaderMoveTriggersNemesisResolutionForOpponent` | Only the Nemesis owner moves, and `activeColor` stays |
| `NemesisResolutionTest.activePlayerCannotMoveWhileNemesisResolutionPending` | The active player is blocked until Nemesis resolves |
| `LegalActionsResolverTest.includesDefaultMovesForActiveLeaderAtTurnStart` | A fresh game lists leader default moves |
| `LegalActionsResolverEdgeCasesTest.tacticianMayMoveDistantAllyWhenAnotherAllyPinsEnemyLeader` | The pinning ally and the moved ally can differ |
| `LegalActionsResolverEdgeCasesTest.froggedPieceHasNoActiveAbilityCandidates` | Frog keeps a default move and loses actives |
| `LegalActionsResolverEdgeCasesTest.willOWispHasTeleportOnlyNotDefaultMove` | Wisp has no default move |
| `LegalActionsResolverEdgeCasesTest.protectorBlocksEnemyManipulatorMove` | No manipulator action against a protected target |
| `LegalActionsResolverEdgeCasesTest.pendingAcrobatOffersOnlySecondJumpOrComplete` | Pending acrobat freezes every other piece |

### Per-character legal actions

| Test | Locks |
|---|---|
| `CharacterLegalActionsTest.leaderHasDefaultMoveWithTargetCell` | Leader default move exposes a cell |
| `CharacterLegalActionsTest.leaderWithVizierMayHaveExtendedDefaultMove` | Vizier adds destinations |
| `CharacterLegalActionsTest.shamanHasVisibleLineActiveAbility` | Shaman targets a piece id |
| `CharacterLegalActionsTest.sniperHasDefaultMoveOnly` | Sniper has no active |
| `CharacterLegalActionsTest.tacticianHasActiveAbilityWithTargets` | Tactician sends piece and cell |
| `CharacterLegalActionsTest.willOWispHasTeleportOnly` | Wisp teleports |
| `CharacterLegalActionsTest.acrobatHasJumpActiveAbility` | Acrobat names the jumped piece |
| `CharacterLegalActionsTest.riderHasTwoStepActiveAbility` | Rider names a cell |
| `CharacterLegalActionsTest.bruiserHasPushActiveAbility` | Bruiser names enemy and push cell |
| `CharacterLegalActionsTest.royalGuardHasLeaderAdjacentActiveAbility` | First step is leader-adjacent |
| `CharacterLegalActionsTest.illusionistHasSwapActiveAbility` | Swap names a piece |
| `CharacterLegalActionsTest.clawLauncherHasAdvanceOrDragChoiceGroup` | Claw options share a choice group |
| `CharacterLegalActionsTest.manipulatorHasLineMoveActiveAbility` | First manipulator step is piece-only |
| `CharacterLegalActionsTest.wandererHasNonAdjacentEnemyActiveAbility` | Wanderer names a cell |
| `CharacterLegalActionsTest.brewmasterHasAllyMoveActiveAbility` | Brewmaster names ally and cell |
| `CharacterLegalActionsTest.passiveCharactersHaveDefaultMoveOnly` | Archer, Assassin, Jailor, Protector, Vizier, Hermit, Cub |
| `CharacterLegalActionsTest.nemesisHasNoVoluntaryActions` | Nemesis has nothing on its owner's turn |
| `WandererLegalActionsTest.legalActionsMatchNonEnemyAdjacentEmptyCells` | Destination set matches the rule |
| `WandererLegalActionsTest.excludesEmptyHexesAdjacentToEnemy` | Enemy-adjacent empties are out |
| `WandererLegalActionsTest.allowsEmptyHexAdjacentToAllyButNotEnemy` | Ally adjacency is fine |
| `WandererLegalActionsTest.jailorAdjacentSuppressesActiveAbility` | Jailor removes the teleport |
| `WandererLegalActionsTest.leaderAlreadyInCaptureStillAllowsUnrelatedWandererTeleports` | Already-unsafe leader does not freeze other pieces |
| `WandererLegalActionsTest.leaderSafetyBlocksTeleportThatNewlyExposesLeaderToCapture` | A newly unsafe leader is rejected |
| `WandererLegalActionsTest.applyTeleportMovesWandererToChosenEmptyCell` | Apply updates the cell |
| `AcrobatLegalActionsTest.initialStepListsJumpTargetsByPieceIdOnly` | No cell on step 1 |
| `AcrobatLegalActionsTest.afterFirstJumpPendingStepListsSecondJumpTargetsByPieceId` | Step 2 is still by piece id |
| `ManipulatorLegalActionsTest.initialStepListsEnemyTargetsByPieceIdOnly` | Step 1 is piece-only |
| `ManipulatorLegalActionsTest.afterTargetSelectedPendingStepListsDestinationCells` | Step 2 is cells |
| `ManipulatorLegalActionsTest.blockedLineEnemyBehindCloserEnemyIsNotLegalTarget` | The farther enemy is hidden |
| `ManipulatorLegalActionsTest.adjacentEnemyOnLineIsNotLegalTarget` | Adjacent enemies are excluded |
| `RoyalGuardLegalActionsTest.initialActiveAbilityHighlightsLeaderAdjacentEmptyCells` | First-step cells |
| `RoyalGuardLegalActionsTest.guardOffLeaderRingStillGetsLeaderAdjacentHighlights` | Guard need not start next to the leader |
| `RoyalGuardLegalActionsTest.afterFirstStepPendingOffersSecondStepOrComplete` | Pending offers both |
| `RoyalGuardLegalActionsTest.completeAfterFirstStepWithoutSecondMove` | Complete flag stops the ability |
| `RoyalGuardLegalActionsTest.legacyOneShotTwoStepStillApplies` | `secondCellId` still resolves |
| `VizierLeaderMoveLegalActionsTest.vizierExtendedMoveDoesNotIncludeReturnToStartOrDistanceOneViaTwoSteps` | No return, no fake distance-1 |
| `VizierLeaderMoveLegalActionsTest.duringPendingVizierStepOnlyAdjacentMovesNotTwoHexVizierJump` | Pending step is adjacent only |
| `VizierLeaderMoveLegalActionsTest.afterLeaderSecondMoveWithVizierNoFurtherVizierOrDefaultMoves` | Two steps end the action |
| `VizierLeaderMoveLegalActionsTest.afterLeaderDefaultMoveWithVizierNoFurtherLeaderMoves` | The one-command two-hex jump also ends it |
| `VizierLeaderMoveLegalActionsTest.afterSelfMoveActiveAbilityNoDefaultMoveForThatPiece` | A piece that acted cannot also default-move |
| `BruiserPushLegalActionsTest.oppositeHexesAreAtMostThreeAndExcludeBruiserSide` | Push geometry |
| `BruiserPushLegalActionsTest.legalActionsMatchEmptyOppositeCellsOnly` | Only empty opposite cells |
| `BruiserPushLegalActionsTest.rejectsPushToLateralNeighborWhenEmpty` | A side neighbor is illegal |
| `BruiserPushLegalActionsTest.multipleAdjacentEnemiesEachGetOwnPushOptions` | Options are per enemy |
| `BruiserPushLegalActionsTest.occupiedOppositeCellsAreOmitted` | Occupied push cells are omitted |
| `BruiserPushLegalActionsTest.boardBorderMayOfferFewerThanThreePushes` | Edge can offer fewer than 3 |
| `BruiserPushLegalActionsTest.applyPushPlacesBruiserOnFormerEnemyCellAndEnemyOnPushDestination` | Occupancy after the push |
| `BruiserPushLegalActionsTest.applyPushDoesNotDropBruiserFromCellIndex` | Both pieces stay in `cellToPiece` |

### Encoding, JSON, command feedback

| Test | Locks |
|---|---|
| `GameActionKeyTest.roundTripsDefaultMove` | Default-move key decodes |
| `GameActionKeyTest.roundTripsActiveAbility` | Ability params, including `mode`, round-trip |
| `GameActionKeyTest.legalActionExposesTargetCellFromAbilityParams` | Cell is lifted onto the view |
| `GameActionKeyTest.legalActionUsesFirstStepCellForLegacyRoyalGuardPayload` | `secondCellId` is not the displayed cell |
| `GameStateViewJsonSerializationTest.wandererLegalActionsSerializeTargetCellIdAndStringPieceId` | camelCase, string ids |
| `GameStateViewJsonSerializationTest.manipulatorLegalActionsSerializeTargetPieceIdAndDestinationCell` | Both ids on step 2 |
| `GameStateViewJsonSerializationTest.acrobatLegalActionsSerializeTargetPieceIdOnlyOnFirstStep` | Null cell on step 1 |
| `game/adapter/in/ws/GameWsExceptionHandlerTest.sendsIllegalMoveRejectionToSender` | `ILLEGAL_MOVE` plus the engine message |
| `GameWsExceptionHandlerTest.sendsStaleVersionWithActualVersion` | `STALE_VERSION` plus `actualVersion` |
| `GameWsExceptionHandlerTest.ignoresWhenDestinationIsNotGameCommands` | Rejections are only for the command destination |

---

## 14. Client modules

These are the Leaders modules for the boundaries above. Tests live next to the domain files as `*.test.ts`. The mesh is shared; everything else is Leaders-only.

| Boundary | Module |
|---|---|
| Board — cell table, neighbors, distance, line, visibility | `leaders/domain/board.ts`, `leaders/lib/board-adjacency.ts` |
| State — [Shared game state](#3-shared-game-state), including `activeAbilityBlockedThisPhase` | `leaders/domain/game-state.ts`, `leaders/domain/state.ts` |
| Capture — sniper, captors, assassin, surround | `leaders/domain/capture.ts` |
| Rules — `apply`, phase changes, recruit, frog expiry, Nemesis, leader safety | `leaders/domain/rules.ts`, `leaders/domain/turn.ts` |
| Abilities — one function per character, plus the four pending ids | `leaders/domain/abilities.ts` |
| Legal actions — simulate `apply`, omit recruit and end-phase | `leaders/domain/legal-actions.ts` |
| Lobby — roles, ready, leave, disconnect, chat gates | `leaders/domain/lobby.ts` |
| Agreement — version check, broadcast-on-accept, identical ids for recruited pieces | `leaders/domain/submit.ts`, host path in `leaders/services/room-connection.ts` |
| Mesh — signaling, ICE, request, broadcast | `common/p2p` |
