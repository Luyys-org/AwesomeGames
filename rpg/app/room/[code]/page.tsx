import type { Metadata } from "next";
import Link from "next/link";

import { RoomLobby } from "@/rpg/features/room/room-lobby";
import { isRoomCode } from "@/rpg/lib/room-code";
import { paths } from "@/rpg/paths";

export const metadata: Metadata = {
  title: "Room",
};

export default async function RpgRoomPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const roomCode = code.toUpperCase();
  const valid = isRoomCode(roomCode);

  return (
    <main className="page-shell mx-auto flex w-full max-w-xl flex-1 flex-col px-6 py-8">
      <Link
        href={paths.home}
        className="text-sm text-zinc-400 transition-colors duration-150 hover:text-zinc-50"
      >
        RPG
      </Link>
      {valid ? (
        <RoomLobby roomCode={roomCode} />
      ) : (
        <>
          <h1 className="mt-3 text-2xl font-semibold text-zinc-50">Join a game</h1>
          <p
            role="alert"
            className="mt-4 rounded-lg border border-red-500/30 bg-red-950/40 px-3 py-2 text-sm text-red-200"
          >
            Enter a 6-character room code. It does not use I, L, O, 0, or 1.
          </p>
        </>
      )}
    </main>
  );
}
