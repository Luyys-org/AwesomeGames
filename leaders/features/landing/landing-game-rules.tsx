export function LandingGameRules() {
  return (
    <section aria-labelledby="rules-heading">
      <h2 id="rules-heading" className="text-lg font-semibold text-zinc-50">
        How a match works
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-zinc-400">
        Leaders is a two-player duel on a hex board. You recruit characters over
        the game, manoeuvre your team each turn, and aim to capture the enemy
        Leader. Pieces are not removed from the board when threatened.
      </p>
      <ol className="mt-4 space-y-3 text-sm text-zinc-300">
        <li className="flex gap-3">
          <span className="mt-0.5 shrink-0 font-mono text-xs text-zinc-500">1</span>
          <span>
            <strong className="font-medium text-zinc-100">Action phase</strong> —
            Move your pieces and use active abilities. Each piece acts at most
            once per turn unless an ability says otherwise.
          </span>
        </li>
        <li className="flex gap-3">
          <span className="mt-0.5 shrink-0 font-mono text-xs text-zinc-500">2</span>
          <span>
            <strong className="font-medium text-zinc-100">Recruitment</strong> —
            When your hand has fewer than five characters, take one from the
            face-up offers and place it on your recruitment zone.
          </span>
        </li>
        <li className="flex gap-3">
          <span className="mt-0.5 shrink-0 font-mono text-xs text-zinc-500">3</span>
          <span>
            <strong className="font-medium text-zinc-100">Win</strong> — Capture
            the opposing Leader (usually two of your pieces threatening capture,
            with exceptions such as Assassin, Archer, or Sniper) or surround them
            so they cannot move safely.
          </span>
        </li>
      </ol>
    </section>
  );
}
