"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { HexBackdrop } from "@/leaders/features/landing/hex-backdrop";
import { leadersPaths } from "@/leaders/paths";
import { PlayHeader } from "@/leaders/features/play/play-header";
import { RoomActiveView } from "@/leaders/features/room/room-active-view";
import { getStoredRoomMembership } from "@/leaders/lib/room-storage";
import type { RoomMembershipView } from "@/leaders/services/room.types";

export default function RoomPage() {
  const params = useParams();
  const codeParam = typeof params.code === "string" ? params.code : "";
  const [membership, setMembership] = useState<RoomMembershipView | null>(null);

  useEffect(() => {
    const stored = getStoredRoomMembership();
    if (stored && stored.code.toUpperCase() === codeParam.toUpperCase()) {
      setMembership(stored);
    }
  }, [codeParam]);

  return (
    <div className="page-shell relative flex min-h-full flex-1 flex-col overflow-hidden">
      <HexBackdrop />
      <PlayHeader />

      <main className="relative z-10 flex min-h-0 w-full flex-1 flex-col">
        {membership ? (
          <RoomActiveView membership={membership} onMembershipChange={setMembership} />
        ) : (
          <div className="mx-auto min-w-0 max-w-5xl flex-1 px-6 py-10">
            <h1 className="text-2xl font-semibold text-zinc-50">Room {codeParam}</h1>
            <p className="mt-3 text-zinc-400">
              Open this page from play after creating or joining a game to see room
              details here.
            </p>
            <Link
              href={leadersPaths.home}
              className="btn btn-secondary mt-8"
            >
              Back to play
            </Link>
          </div>
        )}
      </main>
    </div>
  );
}
