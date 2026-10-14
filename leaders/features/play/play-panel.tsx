"use client";

import { usePlay } from "@/leaders/features/play/use-play";

export function PlayPanel() {
  const {
    mode,
    roomName,
    roomCode,
    username,
    error,
    isSubmitting,
    setRoomName,
    setRoomCode,
    setUsername,
    switchMode,
    submit,
  } = usePlay();

  return (
    <section
      aria-labelledby="play-heading"
      className="panel w-full max-w-md p-6 sm:p-8"
    >
      <div className="tabs mb-6">
        {(["create", "join"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => switchMode(tab)}
            className={`tab ${mode === tab ? "is-active" : ""}`}
          >
            {tab === "create" ? "New game" : "Join game"}
          </button>
        ))}
      </div>

      <h2 id="play-heading" className="text-xl font-semibold text-zinc-50">
        {mode === "create" ? "Host a match" : "Enter a room code"}
      </h2>
      <p className="mt-1 text-sm text-zinc-400">
        {mode === "create"
          ? "Create a private room and share the code with your opponent."
          : "In the lobby, choose player or spectator. The host always plays."}
      </p>

      <form
        className="mt-6 space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <label className="block text-sm text-zinc-300">
          Username
          <input
            type="text"
            required
            minLength={3}
            maxLength={64}
            pattern="[A-Za-z0-9_]{3,64}"
            title="3-64 characters: letters, digits, underscore"
            autoComplete="username"
            spellCheck={false}
            placeholder="ada"
            value={username}
            onChange={(event) => {
              setUsername(event.target.value);
            }}
            className="field mt-1 w-full"
          />
        </label>

        {mode === "create" ? (
          <label className="block text-sm text-zinc-300">
            Room name
            <input
              type="text"
              required
              minLength={1}
              maxLength={128}
              placeholder="Friday night duel"
              value={roomName}
              onChange={(event) => {
                setRoomName(event.target.value);
              }}
              className="field mt-1 w-full"
            />
          </label>
        ) : (
          <>
            <label className="block text-sm text-zinc-300">
              Room code
              <input
                type="text"
                required
                minLength={4}
                maxLength={12}
                placeholder="ABCD12"
                autoComplete="off"
                spellCheck={false}
                value={roomCode}
                onChange={(event) => {
                  setRoomCode(event.target.value.toUpperCase());
                }}
                className="field mt-1 w-full font-mono uppercase"
              />
            </label>
          </>
        )}

        {error ? (
          <p
            role="alert"
            className="rounded-lg border border-red-500/30 bg-red-950/40 px-3 py-2 text-sm text-red-200"
          >
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={isSubmitting}
          className="btn btn-primary w-full"
        >
          {isSubmitting
            ? "Please wait…"
            : mode === "create"
              ? "Create game"
              : "Join game"}
        </button>
      </form>
    </section>
  );
}
