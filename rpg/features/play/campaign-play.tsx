"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { InventoryDialog } from "@/rpg/features/play/inventory-dialog";
import { useRoom } from "@/rpg/features/room/use-room";
import { characterIdentity } from "@/rpg/lib/character-options";
import { currencyLabel } from "@/rpg/lib/starting-kit";
import type { TranscriptEntry } from "@/rpg/lib/table";
import { paths } from "@/rpg/paths";

interface CampaignPlayProps {
  roomCode: string;
}

export function CampaignPlay({ roomCode }: CampaignPlayProps) {
  const { view, submitAct } = useRoom(roomCode);
  const router = useRouter();
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [speech, setSpeech] = useState("");
  const [actPending, setActPending] = useState(false);
  const [actError, setActError] = useState<string | null>(null);

  useEffect(() => {
    if (!view || view.link !== "open") return;
    if (view.phase === "lobby" || view.phase === "waiting") {
      router.replace(paths.room(roomCode));
    }
  }, [roomCode, router, view]);

  useEffect(() => {
    if (!inventoryOpen) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setInventoryOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [inventoryOpen]);

  const character =
    view?.seat?.status === "active"
      ? view.characters.find((entry) => entry.id === view.seat?.characterId) ?? null
      : null;
  const identity =
    character && view?.characterOptions ? characterIdentity(character, view.characterOptions) : null;
  const universe = view?.universe ?? "custom";
  const down = character?.wounds.includes("down") === true;

  function sendAct() {
    if (actPending || !character) return;
    setActPending(true);
    setActError(null);
    void submitAct(speech).then((message) => {
      setActPending(false);
      if (message) {
        setActError(message);
        return;
      }
      setSpeech("");
    });
  }

  return (
    <div className="page-shell flex h-dvh min-h-0 flex-col overflow-hidden">
      <header className="grid shrink-0 grid-cols-3 items-center border-b border-[var(--border)] px-4 py-3">
        <div>
          <button
            type="button"
            className="btn btn-secondary"
            disabled={!character}
            onClick={() => setInventoryOpen(true)}
          >
            Inventory
          </button>
        </div>
        <div className="text-center">
          {identity ? (
            <>
              <h1 className="text-lg font-semibold text-zinc-50">{identity.name}</h1>
              <p className="mt-1 text-sm text-zinc-400">
                {[identity.race, identity.className].filter((part) => part.length > 0).join(" · ")}
              </p>
            </>
          ) : (
            <p className="text-sm text-zinc-400">
              {view?.link === "connecting" ? "Connecting to the campaign." : "No character claimed."}
            </p>
          )}
        </div>
        <p className="text-right text-sm text-zinc-50">
          {character ? (
            <>
              <span className="font-semibold">{character.currency}</span>
              <span className="ml-1 text-zinc-400">{currencyLabel(universe)}</span>
            </>
          ) : null}
        </p>
      </header>

      {view?.error ? (
        <p
          role="alert"
          className="shrink-0 border-b border-red-500/30 bg-red-950/40 px-4 py-2 text-sm text-red-200"
        >
          {view.error}
        </p>
      ) : null}

      <div className="flex min-h-0 flex-1">
        <aside className="flex w-60 shrink-0 flex-col overflow-y-auto border-r border-[var(--border)] p-4">
          <h2 className="text-sm font-medium text-zinc-300">Location</h2>
          <dl className="mt-3 space-y-3 text-sm">
            <MapField label="Place" value={view?.location?.place ?? ""} />
            <MapField label="Weather" value={view?.location?.weather ?? ""} />
            <MapField label="Reputation" value={view?.location?.reputation ?? ""} />
            {view?.scene ? <MapField label="Scene" value={String(view.scene)} /> : null}
          </dl>
        </aside>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
            <AgentLog
              transcript={view?.transcript ?? []}
              situation={view?.situation ?? ""}
              characterNames={Object.fromEntries((view?.characters ?? []).map((entry) => [entry.id, entry.name]))}
            />
          </div>

          <form
            className="flex shrink-0 gap-3 border-t border-[var(--border)] p-4"
            onSubmit={(event) => {
              event.preventDefault();
              sendAct();
            }}
          >
            <label className="sr-only" htmlFor="character-speech">
              Speak
            </label>
            <textarea
              id="character-speech"
              className="field min-h-[72px] flex-1 resize-y"
              rows={3}
              maxLength={400}
              value={speech}
              disabled={!character || down || actPending || view?.phase !== "play"}
              placeholder={down ? "You cannot act while down." : "What do you say or do?"}
              onChange={(event) => {
                setSpeech(event.target.value);
                setActError(null);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
                  event.preventDefault();
                  sendAct();
                }
              }}
            />
            <button
              type="submit"
              className="btn btn-primary self-end"
              disabled={!character || down || actPending || view?.phase !== "play"}
            >
              Act
            </button>
          </form>
          {actError ? (
            <p role="alert" className="shrink-0 px-4 pb-3 text-sm text-red-200">
              {actError}
            </p>
          ) : null}
        </div>
      </div>

      {inventoryOpen && character ? (
        <InventoryDialog items={character.inventory} onClose={() => setInventoryOpen(false)} />
      ) : null}
    </div>
  );
}

function MapField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-zinc-400">{label}</dt>
      <dd className="mt-1 text-zinc-50">{value.length > 0 ? value : "—"}</dd>
    </div>
  );
}

function AgentLog({
  transcript,
  situation,
  characterNames,
}: {
  transcript: TranscriptEntry[];
  situation: string;
  characterNames: Record<string, string>;
}) {
  const entries =
    transcript.length > 0
      ? transcript
      : situation
        ? [{ type: "situation" as const, scene: 1, text: situation }]
        : [];

  if (entries.length === 0) {
    return <p className="text-sm text-zinc-400">Waiting for the game master.</p>;
  }

  return (
    <div className="mx-auto w-full max-w-2xl space-y-4">
      {entries.map((entry, index) => (
        <LogEntry key={`${entry.type}-${index}`} entry={entry} characterNames={characterNames} />
      ))}
    </div>
  );
}

function LogEntry({
  entry,
  characterNames,
}: {
  entry: TranscriptEntry;
  characterNames: Record<string, string>;
}) {
  if (entry.type === "intent") {
    const name = characterNames[entry.characterId] ?? "Someone";
    return (
      <p className="text-sm leading-relaxed text-zinc-300">
        <span className="font-medium text-zinc-50">{name}:</span> {entry.text}
      </p>
    );
  }

  if (entry.type === "system") {
    return <p className="text-sm leading-relaxed text-zinc-500">{entry.text}</p>;
  }

  return <p className="text-base leading-relaxed text-zinc-100">{entry.text}</p>;
}
