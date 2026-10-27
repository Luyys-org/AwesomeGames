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
  const { view, submitSpeak, submitAction } = useRoom(roomCode);
  const router = useRouter();
  const [inventoryOpen, setInventoryOpen] = useState(false);
  const [speech, setSpeech] = useState("");
  const [actionId, setActionId] = useState("");
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
  const actions = view?.availableActions ?? [];
  const playReady = view?.phase === "play" && view.loadoutReady;
  const controlsLocked = !character || down || actPending || !playReady;

  function sendSpeak() {
    if (controlsLocked) return;
    setActPending(true);
    setActError(null);
    void submitSpeak(speech).then((message) => {
      setActPending(false);
      if (message) {
        setActError(message);
        return;
      }
      setSpeech("");
    });
  }

  function sendAction() {
    if (controlsLocked) return;
    setActPending(true);
    setActError(null);
    void submitAction(actionId).then((message) => {
      setActPending(false);
      if (message) {
        setActError(message);
        return;
      }
      setActionId("");
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
            {!view?.loadoutReady && view?.phase === "play" ? (
              <p className="mb-4 text-sm text-zinc-400">The game master is preparing starting gear.</p>
            ) : null}
            <AgentLog
              transcript={view?.transcript ?? []}
              situation={view?.situation ?? ""}
              characterNames={Object.fromEntries((view?.characters ?? []).map((entry) => [entry.id, entry.name]))}
            />
          </div>

          <div className="shrink-0 border-t border-[var(--border)] p-4">
            <div className="grid gap-4 sm:grid-cols-[minmax(12rem,16rem)_1fr]">
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  sendAction();
                }}
              >
                <label className="block text-sm text-zinc-300" htmlFor="scene-action">
                  Action
                  <select
                    id="scene-action"
                    className="field mt-1 w-full"
                    value={actionId}
                    disabled={controlsLocked || actions.length === 0}
                    onChange={(event) => {
                      setActionId(event.target.value);
                      setActError(null);
                    }}
                  >
                    <option value="">
                      {actions.length === 0 ? "No actions yet" : "Choose an action"}
                    </option>
                    {actions.map((action) => (
                      <option key={action.id} value={action.id}>
                        {action.label}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="submit"
                  className="btn btn-primary mt-2"
                  disabled={controlsLocked || actionId.length === 0}
                >
                  Act
                </button>
              </form>

              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  sendSpeak();
                }}
              >
                <label className="block text-sm text-zinc-300" htmlFor="character-speech">
                  Speak
                  <textarea
                    id="character-speech"
                    className="field mt-1 min-h-[72px] w-full resize-y"
                    rows={3}
                    maxLength={400}
                    value={speech}
                    disabled={controlsLocked}
                    placeholder={down ? "You cannot act while down." : "What does your character say?"}
                    onChange={(event) => {
                      setSpeech(event.target.value);
                      setActError(null);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
                        event.preventDefault();
                        sendSpeak();
                      }
                    }}
                  />
                </label>
                <button
                  type="submit"
                  className="btn btn-secondary mt-2"
                  disabled={controlsLocked || speech.trim().length === 0}
                >
                  Speak
                </button>
              </form>
            </div>
            {actError ? (
              <p role="alert" className="mt-3 text-sm text-red-200">
                {actError}
              </p>
            ) : null}
          </div>
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
    const prefix = entry.kind === "speak" ? `${name} says` : name;
    return (
      <p className="text-sm leading-relaxed text-zinc-300">
        <span className="font-medium text-zinc-50">{prefix}:</span> {entry.text}
      </p>
    );
  }

  if (entry.type === "system") {
    return <p className="text-sm leading-relaxed text-zinc-500">{entry.text}</p>;
  }

  return <p className="text-base leading-relaxed text-zinc-100">{entry.text}</p>;
}
