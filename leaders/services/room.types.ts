export type RoomStatus = "WAITING" | "LOBBY" | "IN_GAME" | "FINISHED";

export type RoomRole = "HOST" | "GUEST" | "SPECTATOR";

export interface RoomMemberView {
  role: RoomRole;
  username: string;
}

export interface RoomMembershipView {
  code: string;
  name: string;
  status: RoomStatus;
  role: RoomRole;
  members?: RoomMemberView[];
}

export interface ChatMessageView {
  senderPlayerId: string;
  senderUsername: string;
  senderRole: RoomRole;
  text: string;
  sentAt: string;
}
