"use client";

import { useParams } from "next/navigation";

import { GameActiveView } from "@/leaders/features/game/game-active-view";
import { GameEndActions } from "@/leaders/features/game/game-end-actions";
import { useGameEndActions } from "@/leaders/features/game/use-game-end-actions";
import { useGamePage } from "@/leaders/features/game/use-game-page";
import { handForColor, viewerColorFromPlayerId } from "@/leaders/lib/game-view-model";
import { HexBackdrop } from "@/leaders/features/landing/hex-backdrop";
import { PlayHeader } from "@/leaders/features/play/play-header";
import { RoomChatPanel } from "@/leaders/features/room/room-chat-panel";
import { useRoomChat } from "@/leaders/features/room/use-room-chat";

function GameLoadingSpinner({ label }: { label: string }) {
  return (
    <div
      className="flex flex-1 items-center justify-center"
      role="status"
      aria-live="polite"
      aria-label={label}
    >
      <div className="size-9 animate-spin rounded-full border-2 border-zinc-700 border-t-amber-500" />
      <span className="sr-only">{label}</span>
    </div>
  );
}

export default function GamePage() {
  const params = useParams();
  const codeParam = typeof params.code === "string" ? params.code : "";

  const {
    membership,
    membershipChecked,
    game,
    loadError,
    isLoading,
    isCommandPending,
    pendingRecruitOfferIndex,
    selectedAbilityPieceId,
    pendingAbilityChoices,
    playerId,
    handleSelectRecruitOffer,
    handleRecruitPlacementCell,
    handleActionBoardCell,
    handleAbilityPieceClick,
    handleDefaultMoveDrop,
    handleAbilityTargetClick,
    handleAbilityChoice,
    dismissAbilityChoices,
    handleEndActionPhase,
  } = useGamePage(codeParam);

  const chat = useRoomChat(membership);
  const gameEndActions = useGameEndActions(membership);

  if (!membershipChecked || !membership) {
    return (
      <div className="page-shell flex h-dvh min-h-0 flex-col">
        <GameLoadingSpinner label="Loading game" />
      </div>
    );
  }

  const actionsDisabled = isLoading;
  const viewerColor = game ? viewerColorFromPlayerId(game, playerId) : null;
  const showEndActionPhase =
    game !== null &&
    game.phase === "ACTION" &&
    !game.resolvingNemesis &&
    viewerColor !== null &&
    game.activeColor === viewerColor;

  const handAtCap =
    game !== null &&
    viewerColor !== null &&
    handForColor(game, viewerColor).length >= 5;

  const endActionPhaseLabel = handAtCap ? "End turn" : "Continue to recruitment phase";
  const endActionPhasePendingLabel = handAtCap ? "Ending…" : "Continuing…";

  return (
    <div className="page-shell relative flex h-dvh min-h-0 flex-col overflow-hidden">
      <HexBackdrop />
      <PlayHeader />

      <main className="relative z-10 flex min-h-0 flex-1 gap-3 px-2 py-2 sm:px-4">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {loadError ? (
          <p
            role="alert"
            className="mb-2 shrink-0 rounded-lg border border-red-500/30 bg-red-950/40 px-3 py-2 text-sm text-red-200"
          >
            {loadError}
          </p>
        ) : null}

        {isLoading ? (
          <GameLoadingSpinner label="Loading game board" />
        ) : game ? (
          <div className="relative min-h-0 flex-1">
            <GameActiveView
              game={game}
              playerId={playerId}
              roomMembers={membership.members}
              pendingRecruitOfferIndex={pendingRecruitOfferIndex}
              selectedAbilityPieceId={selectedAbilityPieceId}
              pendingAbilityChoices={pendingAbilityChoices}
              isCommandPending={isCommandPending}
              showEndActionPhase={showEndActionPhase}
              endActionPhaseLabel={endActionPhaseLabel}
              endActionPhasePendingLabel={endActionPhasePendingLabel}
              endActionPhaseDisabled={actionsDisabled || isCommandPending}
              onEndActionPhase={() => {
                void handleEndActionPhase();
              }}
              onSelectRecruitOffer={handleSelectRecruitOffer}
              onRecruitPlacementCell={(cellId) => {
                void handleRecruitPlacementCell(cellId);
              }}
              onActionBoardCell={(cellId) => {
                void handleActionBoardCell(cellId);
              }}
              onAbilityPieceClick={handleAbilityPieceClick}
              onDefaultMoveDrop={(pieceId, targetCellId) => {
                void handleDefaultMoveDrop(pieceId, targetCellId);
              }}
              onAbilityTargetPieceClick={(cellId, targetPieceId) => {
                void handleAbilityTargetClick(cellId, targetPieceId);
              }}
              onAbilityChoice={handleAbilityChoice}
              onDismissAbilityChoices={dismissAbilityChoices}
            />
            {game.status === "WON" ? (
              <GameEndActions
                onReplay={gameEndActions.replay}
                onLeaveHome={gameEndActions.leaveHome}
                isReplaying={gameEndActions.isReplaying}
                isLeaving={gameEndActions.isLeaving}
                replayError={gameEndActions.replayError}
                leaveError={gameEndActions.leaveError}
              />
            ) : null}
          </div>
        ) : (
          <p className="flex flex-1 items-center justify-center text-sm text-zinc-400">
            The game board is not ready yet.
          </p>
        )}

        </div>

        <div className="flex w-72 min-h-0 shrink-0 flex-col">
          <RoomChatPanel
            className="min-h-0 flex-1"
            membership={membership}
            messages={chat.messages}
            status={chat.status}
            error={chat.error}
            sendMessage={chat.sendMessage}
          />
        </div>
      </main>
    </div>
  );
}
