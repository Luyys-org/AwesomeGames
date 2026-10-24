import { describe, expect, it } from "vitest";

import {
  assertRoomName,
  assertUsername,
  canReadChat,
  chooseSeatRole,
  createRoom,
  disconnectMember,
  generateRoomCode,
  joinRoom,
  leaveRoom,
  LobbyError,
  resetRoomForReplay,
  sendChat,
  setReady,
} from "@/leaders/domain/lobby";
import type { Rng } from "@/leaders/domain/rng";

const rng: Rng = {
  nextId: (() => {
    let n = 0;
    return () => `id-${n++}`;
  })(),
  nextBoolean: () => true,
  nextFloat: () => 0,
};

function hostRoom() {
  return createRoom({
    username: "Ada",
    name: "Table",
    code: "ab12cd",
    hostPlayerId: "host",
    sessionToken: "host-token",
  });
}

describe("lobby", () => {
  it("createsRoomWithHostParticipant", () => {
    const room = hostRoom();
    expect(room.status).toBe("WAITING");
    expect(room.seats[0]?.role).toBe("HOST");
    expect(room.code).toBe("AB12CD");
    expect(room.readyByPlayerId.host).toBe(false);
  });

  it("assignsGuestWhenSlotAvailable", () => {
    const joined = joinRoom(hostRoom(), {
      username: "Bea",
      playerId: "guest",
      sessionToken: "guest-token",
    });
    expect(joined.seat.role).toBe("GUEST");
    expect(joined.room.status).toBe("LOBBY");
    expect(joined.presence?.type).toBe("GUEST_JOINED");
    expect(joined.presence).toMatchObject({ playerId: "guest", username: "Bea" });
  });

  it("assignsSpectatorWhenGuestTaken", () => {
    const withGuest = joinRoom(hostRoom(), {
      username: "Bea",
      playerId: "guest",
      sessionToken: "guest-token",
    }).room;
    const spectator = joinRoom(withGuest, {
      username: "Cyn",
      playerId: "spec",
      sessionToken: "spec-token",
    });
    expect(spectator.seat.role).toBe("SPECTATOR");
    expect(spectator.room.status).toBe("LOBBY");
    expect(spectator.presence).toBeNull();
  });

  it("rejectsDuplicateUsername", () => {
    const withGuest = joinRoom(hostRoom(), {
      username: "Bea",
      playerId: "guest",
      sessionToken: "guest-token",
    }).room;
    expect(() =>
      joinRoom(withGuest, { username: "Bea", playerId: "other", sessionToken: "other" }),
    ).toThrow(/Username is already taken in this room/);
  });

  it("guestLeaveFreesSlotAndRevertsLobbyToWaiting", () => {
    const withGuest = joinRoom(hostRoom(), {
      username: "Bea",
      playerId: "guest",
      sessionToken: "guest-token",
    }).room;
    const left = leaveRoom(withGuest, "guest");
    expect(left.room.status).toBe("WAITING");
    expect(left.presence.type).toBe("GUEST_LEFT");
    expect(left.room.seats.some((seat) => seat.role === "GUEST")).toBe(false);
  });

  it("spectatorLeaveRemovesMembershipWithoutStatusChange", () => {
    let room = joinRoom(hostRoom(), {
      username: "Bea",
      playerId: "guest",
      sessionToken: "guest-token",
    }).room;
    room = joinRoom(room, { username: "Cyn", playerId: "spec", sessionToken: "spec-token" }).room;
    const left = leaveRoom(room, "spec");
    expect(left.room.status).toBe("LOBBY");
    expect(left.presence.type).toBe("DISCONNECTED");
  });

  it("hostLeavePromotesGuest", () => {
    const withGuest = joinRoom(hostRoom(), {
      username: "Bea",
      playerId: "guest",
      sessionToken: "guest-token",
    }).room;
    const left = leaveRoom(withGuest, "host");
    expect(left.promotedHostPlayerId).toBe("guest");
    expect(left.room.seats.find((seat) => seat.playerId === "guest")?.role).toBe("HOST");
    expect(left.room.seats.some((seat) => seat.role === "HOST" && seat.playerId === "host")).toBe(
      false,
    );
  });

  it("hostLeaveClosesRoomWhenOnlySpectatorsRemain", () => {
    let room = joinRoom(hostRoom(), {
      username: "Bea",
      playerId: "guest",
      sessionToken: "guest-token",
    }).room;
    room = chooseSeatRole(room, "guest", "SPECTATOR");
    room = joinRoom(room, { username: "Cyn", playerId: "spec", sessionToken: "spec-token" }).room;
    const left = leaveRoom(room, "host");
    expect(left.roomClosed).toBe(true);
    expect(left.room.seats.every((seat) => seat.role === "SPECTATOR")).toBe(true);
  });

  it("chooseSeatRoleMovesSpectatorToGuest", () => {
    let room = joinRoom(hostRoom(), {
      username: "Bea",
      playerId: "guest",
      sessionToken: "guest-token",
    }).room;
    room = joinRoom(room, { username: "Cyn", playerId: "spec", sessionToken: "spec-token" }).room;
    room = chooseSeatRole(room, "spec", "GUEST");
    expect(room.status).toBe("LOBBY");
    expect(room.seats.find((seat) => seat.playerId === "spec")?.role).toBe("GUEST");
  });

  it("hostCannotChooseSpectatorSeat", () => {
    expect(() => chooseSeatRole(hostRoom(), "host", "SPECTATOR")).toThrow(/Host must remain a player/);
  });

  it("publishesPlayerReadyWhenMarkedReady", () => {
    const room = joinRoom(hostRoom(), {
      username: "Bea",
      playerId: "guest",
      sessionToken: "guest-token",
    }).room;
    const ready = setReady(room, "host", true, rng);
    expect(ready.started).toBe(false);
    expect(ready.presence[0]?.type).toBe("PLAYER_READY");
    expect(ready.room.game).toBeNull();
  });

  it("publishesPlayerUnreadyWhenMarkedNotReady", () => {
    const room = joinRoom(hostRoom(), {
      username: "Bea",
      playerId: "guest",
      sessionToken: "guest-token",
    }).room;
    const unready = setReady(room, "guest", false, rng);
    expect(unready.presence[0]?.type).toBe("PLAYER_UNREADY");
  });

  it("resetRoomForReplayReturnsToLobby", () => {
    let room = joinRoom(hostRoom(), {
      username: "Bea",
      playerId: "guest",
      sessionToken: "guest-token",
    }).room;
    room = setReady(room, "host", true, rng).room;
    room = setReady(room, "guest", true, rng).room;
    expect(room.status).toBe("IN_GAME");
    room = {
      ...room,
      status: "FINISHED",
      game: room.game ? { ...room.game, status: "WON" } : null,
    };
    const replay = resetRoomForReplay(room);
    expect(replay.status).toBe("LOBBY");
    expect(replay.game).toBeNull();
    expect(replay.readyByPlayerId.host).toBe(false);
    expect(replay.readyByPlayerId.guest).toBe(false);
    expect(resetRoomForReplay(replay)).toBe(replay);
  });

  it("startsWhenBothReadyAndAssignsHostBlack", () => {
    let room = joinRoom(hostRoom(), {
      username: "Bea",
      playerId: "guest",
      sessionToken: "guest-token",
    }).room;
    room = setReady(room, "host", true, rng).room;
    const started = setReady(room, "guest", true, rng);
    expect(started.started).toBe(true);
    expect(started.room.status).toBe("IN_GAME");
    expect(started.presence.some((event) => event.type === "GAME_STARTED")).toBe(true);
    expect(started.room.game?.blackPlayerId).toBe("host");
    expect(started.room.game?.whitePlayerId).toBe("guest");
    expect(() => setReady(started.room, "host", true, rng)).toThrow(/Game already started/);
  });

  it("inGameDisconnectKeepsMembership", () => {
    let room = joinRoom(hostRoom(), {
      username: "Bea",
      playerId: "guest",
      sessionToken: "guest-token",
    }).room;
    room = setReady(room, "host", true, rng).room;
    room = setReady(room, "guest", true, rng).room;
    const dropped = disconnectMember(room, "guest");
    expect(dropped.removed).toBe(false);
    expect(dropped.room.seats.some((seat) => seat.playerId === "guest")).toBe(true);
    expect(dropped.presence?.type).toBe("DISCONNECTED");
  });

  it("lobbyDisconnectRemovesGuest", () => {
    const room = joinRoom(hostRoom(), {
      username: "Bea",
      playerId: "guest",
      sessionToken: "guest-token",
    }).room;
    const dropped = disconnectMember(room, "guest");
    expect(dropped.removed).toBe(true);
    expect(dropped.room.status).toBe("WAITING");
    expect(dropped.presence?.type).toBe("GUEST_LEFT");
  });

  it("chatGates", () => {
    let room = joinRoom(hostRoom(), {
      username: "Bea",
      playerId: "guest",
      sessionToken: "guest-token",
    }).room;
    room = joinRoom(room, { username: "Cyn", playerId: "spec", sessionToken: "spec-token" }).room;
    expect(sendChat(room, "host", "player", "  hello ", "t").text).toBe("hello");
    expect(() => sendChat(room, "spec", "player", "no", "t")).toThrow(
      /Only players can send messages in player chat/,
    );
    expect(() => sendChat(room, "host", "spectator", "no", "t")).toThrow(
      /Only spectators can send messages in spectator chat/,
    );
    expect(() => sendChat(room, "host", "player", "   ", "t")).toThrow(/Message text is required/);
    expect(canReadChat("SPECTATOR", "player")).toBe(true);
    expect(canReadChat("HOST", "spectator")).toBe(false);
  });

  it("rejectsBadNamesAndExhaustsRoomCodes", () => {
    expect(() => assertUsername("no")).toThrow(/Username must be 3-64/);
    expect(() => assertRoomName("   ")).toThrow(/Room name is required/);
    expect(() => generateRoomCode(() => true, 6, () => 0)).toThrow(
      /Failed to generate a unique room code/,
    );
  });

  it("reclaimsSeatByTokenWithoutFreeingTheName", () => {
    const room = joinRoom(hostRoom(), {
      username: "Bea",
      playerId: "guest",
      sessionToken: "guest-token",
    }).room;
    const again = joinRoom(room, {
      username: "Bea",
      playerId: "other",
      sessionToken: "guest-token",
    });
    expect(again.seat.playerId).toBe("guest");
    expect(again.room.seats).toHaveLength(2);
  });

  it("readyRequiresAPlayer", () => {
    let room = joinRoom(hostRoom(), {
      username: "Bea",
      playerId: "guest",
      sessionToken: "guest-token",
    }).room;
    room = joinRoom(room, { username: "Cyn", playerId: "spec", sessionToken: "spec-token" }).room;
    expect(() => setReady(room, "spec", true, rng)).toThrow(LobbyError);
  });
});
