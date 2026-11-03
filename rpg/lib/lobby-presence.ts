export interface LobbyPlayer {
  id: string;
  name: string;
  connected: boolean;
  characterId: string | null;
}

export interface ConnectedPeer {
  id: string;
  characterId: string | null;
}

export interface DepartedPlayer {
  id: string;
  characterId: string;
}

export interface RosterCharacter {
  id: string;
  name: string;
}

export function joiningCount(players: readonly LobbyPlayer[]): number {
  return players.filter((player) => player.connected && player.characterId === null).length;
}

export function peerLeft(
  peers: readonly ConnectedPeer[],
  departed: readonly DepartedPlayer[],
  peerId: string,
): { peers: ConnectedPeer[]; departed: DepartedPlayer[] } {
  const peer = peers.find((entry) => entry.id === peerId);
  if (!peer) return { peers: [...peers], departed: [...departed] };

  const nextPeers = peers.filter((entry) => entry.id !== peerId);
  if (!peer.characterId) return { peers: nextPeers, departed: [...departed] };

  return {
    peers: nextPeers,
    departed: [
      ...departed.filter((entry) => entry.characterId !== peer.characterId),
      { id: peer.id, characterId: peer.characterId },
    ],
  };
}

export function forgetDeparted(
  departed: readonly DepartedPlayer[],
  characterId: string,
): DepartedPlayer[] {
  return departed.filter((entry) => entry.characterId !== characterId);
}

export function buildLobbyRoster(input: {
  hostId: string;
  hostCharacter: { id: string; name: string } | null;
  peers: readonly ConnectedPeer[];
  departed: readonly DepartedPlayer[];
  characters: readonly RosterCharacter[];
}): LobbyPlayer[] {
  const names = new Map(input.characters.map((character) => [character.id, character.name]));
  const claimed = new Set<string>();
  const players: LobbyPlayer[] = [
    {
      id: input.hostId,
      name: input.hostCharacter?.name ?? "Host",
      connected: true,
      characterId: input.hostCharacter?.id ?? null,
    },
  ];
  if (input.hostCharacter) claimed.add(input.hostCharacter.id);

  for (const peer of input.peers) {
    if (peer.characterId) claimed.add(peer.characterId);
    const name = peer.characterId ? names.get(peer.characterId) : undefined;
    players.push({
      id: peer.id,
      name: name ?? "Guest",
      connected: true,
      characterId: peer.characterId,
    });
  }

  for (const gone of input.departed) {
    if (claimed.has(gone.characterId)) continue;
    const name = names.get(gone.characterId);
    if (!name) continue;
    players.push({
      id: gone.id,
      name,
      connected: false,
      characterId: gone.characterId,
    });
  }

  return players;
}

export function parseLobbyPlayers(value: unknown): LobbyPlayer[] | null {
  if (!Array.isArray(value)) return null;
  const players: LobbyPlayer[] = [];
  for (const entry of value) {
    if (!isRecord(entry)) return null;
    if (typeof entry.id !== "string" || typeof entry.name !== "string") return null;
    if (typeof entry.connected !== "boolean") return null;
    if (entry.characterId !== null && typeof entry.characterId !== "string") return null;
    players.push({
      id: entry.id,
      name: entry.name,
      connected: entry.connected,
      characterId: entry.characterId,
    });
  }
  return players;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
