"use client";

import { useState } from "react";

import { characterSummary } from "@/rpg/lib/character-options";
import { CharacterForm, ClaimForm } from "@/rpg/features/room/character-form";
import { useRoom } from "@/rpg/features/room/use-room";

interface RoomLobbyProps {
  roomCode: string;
}

export function RoomLobby({ roomCode }: RoomLobbyProps) {
  const { view, createCharacter, claimCharacter } = useRoom(roomCode);
  const [copied, setCopied] = useState(false);
  const characters = (view?.characters ?? []).filter((character) => !character.archived);
  const canCreate =
    view !== null &&
    view.seat === null &&
    (view.role === "host"
      ? view.error !== "This room already has a host."
      : view.phase === "lobby" && view.link === "open");
  const mustClaim = view?.seat?.status === "replaced" && view.link === "open";

  return (
    <>
      <h1 className="mt-3 text-2xl font-semibold text-zinc-50">
        {view?.campaignName ?? "Room"}
      </h1>
      {view?.universeName ? (
        <p className="mt-2 text-base text-zinc-400">{view.universeName}</p>
      ) : null}
      {view?.objective ? (
        <p className="mt-1 text-base text-zinc-400">{view.objective}</p>
      ) : null}

      <div className="mt-6 flex items-center gap-3">
        <p className="font-mono text-2xl font-semibold text-zinc-50">{roomCode}</p>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => {
            void navigator.clipboard.writeText(roomCode).then(
              () => {
                setCopied(true);
                window.setTimeout(() => setCopied(false), 2000);
              },
              () => {
                setCopied(false);
              },
            );
          }}
        >
          {copied ? "Copied" : "Copy code"}
        </button>
      </div>
      <p className="mt-2 text-sm text-zinc-400">
        {view?.role === "host"
          ? "Share this code. Other players join from the RPG page and create a character."
          : view?.seat?.status === "active"
            ? "You are in the party."
            : "You joined this table. Create your character when the lobby is open."}
      </p>

      {view?.error ? (
        <p
          role="alert"
          className="mt-4 rounded-lg border border-red-500/30 bg-red-950/40 px-3 py-2 text-sm text-red-200"
        >
          {view.error}
        </p>
      ) : null}

      {!view || view.link === "connecting" ? (
        <p className="mt-4 text-sm text-zinc-400">Connecting to the room.</p>
      ) : null}

      {view?.link === "open" && view.role === "peer" && view.phase === "waiting" ? (
        <p className="mt-4 text-sm text-zinc-400">Waiting for the host to create a character.</p>
      ) : null}

      <section aria-labelledby="party-heading" className="panel mt-6 p-6">
        <h2 id="party-heading" className="text-xl font-semibold text-zinc-50">
          Party
          {view?.playerCount ? (
            <span className="ml-2 text-base font-normal text-zinc-400">
              {` ${characters.length} of ${view.playerCount}`}
            </span>
          ) : null}
        </h2>

        {characters.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-400">No characters yet.</p>
        ) : (
          <ul className="mt-4">
            {characters.map((character) => {
              const yours = view?.seat?.characterId === character.id && view.seat.status === "active";
              return (
                <li key={character.id} className="border-t border-[var(--border)] py-3 first:border-t-0">
                  <p className="text-sm text-zinc-50">
                    {character.name}
                    {yours ? " (you)" : ""}
                  </p>
                  <p className="mt-1 text-sm text-zinc-400">
                    {view?.characterOptions ? characterSummary(character, view.characterOptions) : ""}
                  </p>
                  {yours && view?.seat ? (
                    <p className="mt-1 font-mono text-sm text-zinc-300">
                      Claim code {view.seat.claimCode}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}

        {view && view.role === "host" && view.joiningCount > 0 ? (
          <p className="mt-4 text-sm text-zinc-400">
            {view.joiningCount === 1
              ? "1 player has joined and has not created a character."
              : `${view.joiningCount} players have joined and have not created a character.`}
          </p>
        ) : null}
      </section>

      {canCreate ? (
        <section aria-labelledby="character-heading" className="panel mt-6 p-6">
          <h2 id="character-heading" className="text-xl font-semibold text-zinc-50">
            Your character
          </h2>
          <p className="mt-1 text-sm text-zinc-400">
            {view?.role === "host"
              ? "Create your character to open the lobby."
              : "Create the character you will play."}
          </p>
          {view?.characterOptions ? (
            <CharacterForm options={view.characterOptions} onSubmit={createCharacter} />
          ) : null}
        </section>
      ) : null}

      {mustClaim ? (
        <section aria-labelledby="claim-heading" className="panel mt-6 p-6">
          <h2 id="claim-heading" className="text-xl font-semibold text-zinc-50">
            Claim your character
          </h2>
          <p className="mt-1 text-sm text-zinc-400">
            Someone else took this seat. Claim it again with the name and claim code.
          </p>
          <ClaimForm onSubmit={claimCharacter} />
        </section>
      ) : null}
    </>
  );
}
