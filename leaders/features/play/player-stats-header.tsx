"use client";

import { createPortal } from "react-dom";
import { useCallback, useEffect, useId, useRef, useState } from "react";

import { usePlayerHeaderStats } from "@/leaders/features/play/use-player-header-stats";

const PANEL_ANIMATION_MS = 180;

function StatsChevron({ open }: { open: boolean }) {
  return (
    <span
      aria-hidden
      className="absolute bottom-0 left-1/2 flex -translate-x-1/2 translate-y-1/2 items-center justify-center rounded-full border border-zinc-800 bg-zinc-950 px-1.5 py-0.5 text-zinc-400"
    >
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`transition-transform duration-200 ease-out ${open ? "rotate-180" : ""}`}
      >
        <path
          d="M4 6L8 10L12 6"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

export function PlayerStatsHeader() {
  const detailsId = useId();
  const headerStats = usePlayerHeaderStats();
  const [panelMounted, setPanelMounted] = useState(false);
  const [panelExiting, setPanelExiting] = useState(false);
  const closeTimerRef = useRef<number | null>(null);

  const panelOpen = panelMounted && !panelExiting;

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return clearCloseTimer;
  }, [clearCloseTimer]);

  const openPanel = useCallback(() => {
    clearCloseTimer();
    setPanelExiting(false);
    setPanelMounted(true);
  }, [clearCloseTimer]);

  const closePanel = useCallback(() => {
    if (!panelMounted || panelExiting) {
      return;
    }

    clearCloseTimer();
    setPanelExiting(true);
    closeTimerRef.current = window.setTimeout(() => {
      setPanelMounted(false);
      setPanelExiting(false);
    }, PANEL_ANIMATION_MS);
  }, [clearCloseTimer, panelExiting, panelMounted]);

  useEffect(() => {
    if (!panelOpen) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closePanel();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [closePanel, panelOpen]);

  useEffect(() => {
    if (!panelOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [panelOpen]);

  const overlay =
    panelMounted && typeof document !== "undefined"
      ? createPortal(
          <>
            <button
              type="button"
              aria-label="Close statistics"
              className={`overlay fixed inset-0 z-[60] cursor-default ${panelExiting ? "stats-backdrop is-exiting" : "stats-backdrop"}`}
              onClick={closePanel}
            />

            <div
              id={detailsId}
              role="region"
              aria-label="Player statistics details"
              className={`fixed inset-x-0 top-0 z-[70] border-b border-zinc-800 bg-zinc-950/95 shadow-lg backdrop-blur-sm ${panelExiting ? "stats-panel is-exiting" : "stats-panel"}`}
            >
              <button
                type="button"
                className="relative flex w-full flex-col items-center px-4 pb-6 pt-5 text-left transition-colors hover:bg-zinc-900/40 sm:px-6"
                aria-expanded
                onClick={closePanel}
              >
                <span className="sr-only">Collapse player statistics.</span>

                <div className="mx-auto w-full max-w-6xl">
                  <p className="text-center text-xs text-zinc-500">
                    Saved locally in this browser only
                  </p>

                  <div className="mt-4 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3 lg:grid-cols-6">
                    {headerStats.details.map((stat) => (
                      <div key={stat.label} className="min-w-0 text-center sm:text-left">
                        <p className="truncate text-xs text-zinc-500">{stat.label}</p>
                        <p className="mt-0.5 text-lg font-semibold tabular-nums text-zinc-100">
                          {stat.value}
                        </p>
                      </div>
                    ))}
                  </div>

                  {!headerStats.hasRecordedGames ? (
                    <p className="mt-6 text-center text-sm text-zinc-500 sm:text-left">
                      No statistics recorded yet. Finish a match as a player to start your history.
                    </p>
                  ) : null}
                </div>

                <StatsChevron open />
              </button>
            </div>
          </>,
          document.body,
        )
      : null;

  return (
    <>
      <header
        aria-hidden={panelMounted}
        className={`relative z-10 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-sm ${panelMounted ? "invisible pointer-events-none" : ""}`}
      >
        <button
          type="button"
          className="relative flex w-full flex-col items-center px-4 pb-5 pt-4 text-left transition-colors hover:bg-zinc-900/40 sm:px-6"
          aria-expanded={panelOpen}
          aria-controls={detailsId}
          onClick={openPanel}
          tabIndex={panelMounted ? -1 : 0}
        >
          <span className="sr-only">Expand player statistics.</span>
          <div className="grid w-full max-w-md grid-cols-3 gap-3 sm:max-w-lg sm:gap-8">
            {headerStats.summary.map((stat) => (
              <div key={stat.label} className="min-w-0 text-center">
                <p className="truncate text-xs text-zinc-500">{stat.label}</p>
                <p className="mt-0.5 text-base font-semibold tabular-nums text-zinc-100 sm:text-lg">
                  {stat.value}
                </p>
              </div>
            ))}
          </div>
          <StatsChevron open={false} />
        </button>
      </header>

      {overlay}
    </>
  );
}
