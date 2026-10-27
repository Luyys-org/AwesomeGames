"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { readBrowserSave, startLobbyFromSave } from "@/rpg/lib/host-save";
import { ensureUniversePresets } from "@/rpg/lib/universe-presets";
import { isRoomCode } from "@/rpg/lib/room-code";
import { paths } from "@/rpg/paths";

const ROOM_CODE_ERROR =
  "Enter a 6-character room code. It does not use I, L, O, 0, or 1.";

interface SessionPanelsProps {
  ready: boolean;
  linked: boolean;
}

export function SessionPanels({ ready, linked }: SessionPanelsProps) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [roomCode, setRoomCode] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [loadingSave, setLoadingSave] = useState(false);

  async function openSave(raw: string) {
    setLoadingSave(true);
    setCreateError(null);
    try {
      await ensureUniversePresets();
    } catch {
      // A save that already stores its character options can still load.
    }
    const result = startLobbyFromSave(raw);
    setLoadingSave(false);
    if (!result.ok) {
      setCreateError(result.error);
      return;
    }
    router.push(paths.room(result.roomCode));
  }

  function loadExistingSave() {
    if (!linked) {
      setCreateError("Link an AI provider before you load a save.");
      return;
    }

    setCreateError(null);
    const stored = readBrowserSave();
    if (stored) {
      void openSave(stored);
      return;
    }

    fileRef.current?.click();
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <section aria-labelledby="create-heading" className="panel p-6">
        <h2 id="create-heading" className="text-xl font-semibold text-zinc-50">
          Create a game
        </h2>
        <p className="mt-1 text-sm text-zinc-400">
          You host and you play. The game master uses the provider linked on this page.
        </p>

        <div className="mt-6 space-y-4">
          {createError ? (
            <p
              role="alert"
              className="rounded-lg border border-red-500/30 bg-red-950/40 px-3 py-2 text-sm text-red-200"
            >
              {createError}
            </p>
          ) : null}
          <button
            type="button"
            disabled={!ready || !linked}
            className="btn btn-primary w-full"
            onClick={() => {
              if (!linked) {
                setCreateError("Link an AI provider before you create a game.");
                return;
              }
              router.push(paths.newGame);
            }}
          >
            Create game
          </button>
          <button
            type="button"
            disabled={!ready || !linked || loadingSave}
            className="btn btn-secondary w-full"
            onClick={loadExistingSave}
          >
            Load existing save
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".rpg.json,.json,application/json"
            className="hidden"
            tabIndex={-1}
            aria-hidden="true"
            onChange={(event) => {
              const input = event.target;
              const file = input.files?.[0];
              input.value = "";
              if (!file) return;

              setCreateError(null);
              void file.text().then(
                (raw) => {
                  void openSave(raw);
                },
                () => {
                  setCreateError("The save could not be read.");
                },
              );
            }}
          />
          {ready && !linked ? (
            <p className="text-sm text-zinc-400">Link an AI provider to create or load a game.</p>
          ) : null}
          {linked ? (
            <p className="text-sm text-zinc-400">
              Loads the save in this browser, or a file when there is none.
            </p>
          ) : null}
        </div>
      </section>

      <section aria-labelledby="join-heading" className="panel p-6">
        <h2 id="join-heading" className="text-xl font-semibold text-zinc-50">
          Join a game
        </h2>
        <p className="mt-1 text-sm text-zinc-400">Enter the 6-character code from the host.</p>

        <form
          className="mt-6 space-y-4"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            const code = roomCode.trim().toUpperCase();
            if (!isRoomCode(code)) {
              setJoinError(ROOM_CODE_ERROR);
              return;
            }
            setJoinError(null);
            router.push(paths.room(code));
          }}
        >
          <label className="block text-sm text-zinc-300">
            Room code
            <input
              type="text"
              required
              minLength={6}
              maxLength={6}
              autoComplete="off"
              spellCheck={false}
              placeholder="K7MQ2P"
              value={roomCode}
              onChange={(event) => {
                setRoomCode(event.target.value.toUpperCase().replace(/\s+/g, "").slice(0, 6));
                setJoinError(null);
              }}
              className="field mt-1 w-full font-mono uppercase"
            />
          </label>

          {joinError ? (
            <p
              role="alert"
              className="rounded-lg border border-red-500/30 bg-red-950/40 px-3 py-2 text-sm text-red-200"
            >
              {joinError}
            </p>
          ) : null}

          <button type="submit" className="btn btn-primary w-full">
            Join game
          </button>
        </form>
      </section>
    </div>
  );
}
