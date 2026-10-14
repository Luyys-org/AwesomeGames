import type { RoomMemberView, RoomMembershipView, RoomRole } from "@/leaders/services/room.types";

export interface RoomParticipantUsernames {
  hostUsername: string | null;
  guestUsername: string | null;
}

export interface RoomParticipantNameSource {
  hostUsername?: string | null;
  guestUsername?: string | null;
}

function applyRoleUsername(
  current: RoomParticipantUsernames,
  role: RoomRole,
  username: string,
): RoomParticipantUsernames {
  const trimmed = username.trim();
  if (!trimmed) {
    return current;
  }

  if (role === "HOST") {
    return { ...current, hostUsername: trimmed };
  }
  if (role === "GUEST") {
    return { ...current, guestUsername: trimmed };
  }

  return current;
}

export function guestJoinedFromMembers(members: RoomMemberView[] | undefined): boolean {
  return members?.some((member) => member.role === "GUEST") ?? false;
}

/** Keeps known members when presence/API payloads omit roles still in the room. */
export function mergeMemberSnapshots(
  previous: RoomMemberView[] | undefined,
  incoming: RoomMemberView[] | undefined,
): RoomMemberView[] | undefined {
  if (!incoming?.length) {
    return previous;
  }
  if (!previous?.length) {
    return incoming;
  }

  const byRole = new Map<RoomRole, RoomMemberView>();
  for (const member of previous) {
    byRole.set(member.role, member);
  }
  for (const member of incoming) {
    byRole.set(member.role, member);
  }

  return Array.from(byRole.values());
}

export function participantUsernamesFromMembers(
  members: RoomMemberView[] | undefined,
): RoomParticipantUsernames {
  let next: RoomParticipantUsernames = { hostUsername: null, guestUsername: null };

  if (!members?.length) {
    return next;
  }

  for (const member of members) {
    next = applyRoleUsername(next, member.role, member.username);
  }

  return next;
}

export function participantUsernamesFromMembership(
  membership: RoomMembershipView,
): RoomParticipantUsernames {
  return participantUsernamesFromMembers(membership.members);
}

export function mergeParticipantUsernames(
  ...sources: Array<RoomParticipantNameSource | null | undefined>
): RoomParticipantUsernames {
  let next: RoomParticipantUsernames = { hostUsername: null, guestUsername: null };

  for (const source of sources) {
    if (!source) {
      continue;
    }
    if (source.hostUsername) {
      next = { ...next, hostUsername: source.hostUsername };
    }
    if (source.guestUsername) {
      next = { ...next, guestUsername: source.guestUsername };
    }
  }

  return next;
}

export function membersFromUnknownPayload(raw: unknown): RoomMemberView[] | null {
  if (typeof raw !== "object" || raw === null) {
    return null;
  }

  const record = raw as Record<string, unknown>;
  const nested = record.payload ?? record.data ?? record.event;
  const merged =
    nested && typeof nested === "object" && nested !== null
      ? { ...record, ...(nested as Record<string, unknown>) }
      : record;

  const members = merged.members;
  if (!Array.isArray(members)) {
    return null;
  }

  const parsed: RoomMemberView[] = [];
  for (const entry of members) {
    if (typeof entry !== "object" || entry === null) {
      continue;
    }
    const member = entry as Record<string, unknown>;
    const role = member.role;
    const username = member.username;
    if (
      (role === "HOST" || role === "GUEST" || role === "SPECTATOR") &&
      typeof username === "string" &&
      username.trim()
    ) {
      parsed.push({ role, username: username.trim() });
    }
  }

  return parsed.length > 0 ? parsed : null;
}

export function participantUsernamesFromPresencePayload(raw: unknown): RoomParticipantUsernames {
  const members = membersFromUnknownPayload(raw);
  if (members) {
    return participantUsernamesFromMembers(members);
  }

  if (typeof raw !== "object" || raw === null) {
    return { hostUsername: null, guestUsername: null };
  }

  const record = raw as Record<string, unknown>;
  let next: RoomParticipantUsernames = { hostUsername: null, guestUsername: null };
  const role = record.role;
  const username = record.username;
  if (
    (role === "HOST" || role === "GUEST" || role === "SPECTATOR") &&
    typeof username === "string"
  ) {
    next = applyRoleUsername(next, role, username);
  }

  return next;
}
