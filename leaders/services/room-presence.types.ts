import type { RoomMemberView, RoomRole } from "@/leaders/services/room.types";

export type RoomPresenceEventType =
  | "GUEST_JOINED"
  | "GUEST_LEFT"
  | "HOST_JOINED"
  | "CONNECTED"
  | "ROOM_CONNECTED"
  | "MEMBERS_SNAPSHOT"
  | "DISCONNECTED"
  | "PLAYER_READY"
  | "PLAYER_UNREADY"
  | "GAME_STARTED"
  | (string & {});

export interface RoomPresenceEvent {
  type: RoomPresenceEventType;
  playerId?: string;
  username?: string;
  role?: RoomRole;
  members?: RoomMemberView[];
}
