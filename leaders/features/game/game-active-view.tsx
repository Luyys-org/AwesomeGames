"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { ActionChoiceOverlay } from "@/leaders/features/game/action-choice-overlay";
import { GameTurnStatus } from "@/leaders/features/game/game-turn-status";
import { GameWinOverlay } from "@/leaders/features/game/game-win-overlay";
import { HexGameBoard } from "@/leaders/features/game/hex-game-board";
import { PlayerHandRow } from "@/leaders/features/game/player-hand-row";
import { RecruitmentOfferOverlay } from "@/leaders/features/game/recruitment-offer-overlay";
import { recruitmentZoneCellIdsForColor } from "@/leaders/lib/board-config";
import {
  abilityChoiceTargetCellIds,
  abilityChoicesAreDistinctHexTargets,
  abilityCompletionOnlyActions,
  activeAbilityTargetsPiecesOnly,
  hasLegalAbilityActions,
  isSameHexActionChoice,
  legalActionChoiceLabel,
  legalAbilityHighlights,
  legalActionsForPiece,
  legalDefaultMoveCellIds,
  legalInteractiveCellIds,
  pieceHasLegalActions,
  ACROBAT_PENDING_ABILITY_ID,
  LEADER_VIZIER_PENDING_ABILITY_ID,
  ROYAL_GUARD_PENDING_ABILITY_ID,
} from "@/leaders/lib/game-legal-actions";
import {
  findNemesisPiece,
  hasPieceActedThisPhase,
  isCellEmpty,
  opponentColor,
  viewerCanActInActionPhase,
  viewerColorFromPlayerId,
  viewerMustResolveNemesis,
} from "@/leaders/lib/game-view-model";
import type { GameLegalAction, GameStateView } from "@/leaders/services/game.types";
import type { RoomMemberView } from "@/leaders/services/room.types";

interface GameActiveViewProps {
  game: GameStateView;
  playerId: string | null;
  roomMembers?: RoomMemberView[];
  pendingRecruitOfferIndex: number | null;
  selectedAbilityPieceId: string | null;
  pendingAbilityChoices: GameLegalAction[] | null;
  isCommandPending: boolean;
  showEndActionPhase: boolean;
  endActionPhasePendingLabel: string;
  endActionPhaseLabel: string;
  endActionPhaseDisabled: boolean;
  onEndActionPhase: () => void;
  onSelectRecruitOffer: (offerIndex: number) => void;
  onRecruitPlacementCell: (cellId: number) => void;
  onActionBoardCell: (cellId: number) => void;
  onAbilityPieceClick: (pieceId: string) => void;
  onDefaultMoveDrop: (pieceId: string, targetCellId: number) => void;
  onAbilityTargetPieceClick: (cellId: number, targetPieceId: string) => void;
  onAbilityChoice: (actionKey: string) => void;
  onDismissAbilityChoices: () => void;
}

export function GameActiveView({
  game,
  playerId,
  roomMembers,
  pendingRecruitOfferIndex,
  selectedAbilityPieceId,
  pendingAbilityChoices,
  isCommandPending,
  showEndActionPhase,
  endActionPhasePendingLabel,
  endActionPhaseLabel,
  endActionPhaseDisabled,
  onEndActionPhase,
  onSelectRecruitOffer,
  onRecruitPlacementCell,
  onActionBoardCell,
  onAbilityPieceClick,
  onDefaultMoveDrop,
  onAbilityTargetPieceClick,
  onAbilityChoice,
  onDismissAbilityChoices,
}: GameActiveViewProps) {
  const [winOverlayDismissed, setWinOverlayDismissed] = useState(false);
  const viewerColor = viewerColorFromPlayerId(game, playerId);
  const isActivePlayer =
    viewerColor !== null && game.activeColor === viewerColor;
  const canActInActionPhase =
    viewerColor !== null && viewerCanActInActionPhase(game, viewerColor);
  const resolvingNemesisAsViewer =
    viewerColor !== null && viewerMustResolveNemesis(game, viewerColor);
  const nemesisPieceId =
    resolvingNemesisAsViewer && viewerColor
      ? (findNemesisPiece(game, viewerColor)?.id ?? null)
      : null;

  const pendingRecruitPieceType =
    pendingRecruitOfferIndex !== null
      ? (game.faceUpOffers?.[pendingRecruitOfferIndex] ?? null)
      : null;

  const abilityFocusedPieceId =
    game.pendingAbility?.pieceId ?? selectedAbilityPieceId;

  const isGameWon = game.status === "WON";

  useEffect(() => {
    if (!isGameWon) {
      setWinOverlayDismissed(false);
    }
  }, [isGameWon, game.gameId]);

  const showWinOverlay = isGameWon && !winOverlayDismissed;

  const showRecruitmentOverlay =
    !isGameWon &&
    isActivePlayer &&
    game.phase === "RECRUITMENT" &&
    pendingRecruitOfferIndex === null &&
    (game.faceUpOffers?.length ?? 0) > 0;

  const placementHighlightCellIds = useMemo(() => {
    if (
      game.phase !== "RECRUITMENT" ||
      pendingRecruitOfferIndex === null ||
      !viewerColor ||
      !isActivePlayer
    ) {
      return [];
    }

    return recruitmentZoneCellIdsForColor(game.activeColor).filter((cellId) =>
      isCellEmpty(game, cellId),
    );
  }, [game, isActivePlayer, pendingRecruitOfferIndex, viewerColor]);

  const nemesisMoveHighlightCellIds = useMemo(() => {
    if (!nemesisPieceId) {
      return [] as number[];
    }

    return legalDefaultMoveCellIds(game, nemesisPieceId);
  }, [game, nemesisPieceId]);

  const pendingHexAbilityChoice =
    pendingAbilityChoices !== null &&
    abilityChoicesAreDistinctHexTargets(pendingAbilityChoices);

  const pendingSameHexActionChoice =
    pendingAbilityChoices !== null && isSameHexActionChoice(pendingAbilityChoices);

  const focusedPieceHasFinishedActing =
    abilityFocusedPieceId !== null &&
    hasPieceActedThisPhase(game, abilityFocusedPieceId) &&
    game.pendingAbility?.pieceId !== abilityFocusedPieceId;

  /** Bruiser, Royal Guard, Acrobat, etc.: pick a highlighted piece before any hex step. */
  const abilityAwaitingPieceTarget =
    abilityFocusedPieceId !== null &&
    activeAbilityTargetsPiecesOnly(game, abilityFocusedPieceId);

  const abilityResolvingServerHexStep =
    abilityFocusedPieceId !== null &&
    game.pendingAbility?.pieceId === abilityFocusedPieceId &&
    !abilityAwaitingPieceTarget;

  const abilityTargets = useMemo(() => {
    if (pendingHexAbilityChoice && pendingAbilityChoices) {
      return {
        cellIds: abilityChoiceTargetCellIds(pendingAbilityChoices),
        pieceIds: [] as string[],
      };
    }

    if (
      game.phase !== "ACTION" ||
      !abilityFocusedPieceId ||
      focusedPieceHasFinishedActing ||
      !canActInActionPhase ||
      resolvingNemesisAsViewer
    ) {
      return { cellIds: [] as number[], pieceIds: [] as string[] };
    }

    return legalAbilityHighlights(game, abilityFocusedPieceId, {
      includePiecePairedCellTargets:
        game.pendingAbility?.pieceId === abilityFocusedPieceId,
    });
  }, [
    abilityFocusedPieceId,
    canActInActionPhase,
    focusedPieceHasFinishedActing,
    game,
    pendingAbilityChoices,
    pendingHexAbilityChoice,
    resolvingNemesisAsViewer,
  ]);

  const selectedPieceMoveHighlightCellIds = useMemo(() => {
    if (pendingHexAbilityChoice) {
      return [] as number[];
    }

    const vizierExtraStep =
      game.pendingAbility?.abilityId === LEADER_VIZIER_PENDING_ABILITY_ID &&
      abilityFocusedPieceId !== null &&
      game.pendingAbility.pieceId === abilityFocusedPieceId;

    if (
      game.phase !== "ACTION" ||
      !abilityFocusedPieceId ||
      focusedPieceHasFinishedActing ||
      !canActInActionPhase ||
      resolvingNemesisAsViewer ||
      abilityAwaitingPieceTarget ||
      (abilityResolvingServerHexStep && !vizierExtraStep)
    ) {
      return [] as number[];
    }

    return legalDefaultMoveCellIds(game, abilityFocusedPieceId);
  }, [
    abilityAwaitingPieceTarget,
    abilityFocusedPieceId,
    abilityResolvingServerHexStep,
    canActInActionPhase,
    focusedPieceHasFinishedActing,
    game,
    pendingHexAbilityChoice,
    resolvingNemesisAsViewer,
  ]);

  const boardClickableCellIds = useMemo(() => {
    if (game.phase === "RECRUITMENT" && pendingRecruitOfferIndex !== null && isActivePlayer) {
      return placementHighlightCellIds;
    }

    if (game.phase !== "ACTION" || !canActInActionPhase) {
      return [] as number[];
    }

    if (resolvingNemesisAsViewer && nemesisPieceId) {
      return nemesisMoveHighlightCellIds;
    }

    if (pendingHexAbilityChoice && pendingAbilityChoices) {
      return abilityChoiceTargetCellIds(pendingAbilityChoices);
    }

    if (abilityFocusedPieceId && !focusedPieceHasFinishedActing) {
      return legalInteractiveCellIds(game, abilityFocusedPieceId);
    }

    return [] as number[];
  }, [
    abilityFocusedPieceId,
    canActInActionPhase,
    focusedPieceHasFinishedActing,
    game,
    isActivePlayer,
    nemesisMoveHighlightCellIds,
    nemesisPieceId,
    pendingAbilityChoices,
    pendingHexAbilityChoice,
    pendingRecruitOfferIndex,
    placementHighlightCellIds,
    resolvingNemesisAsViewer,
  ]);

  const showAbilityHints =
    game.phase === "ACTION" &&
    canActInActionPhase &&
    !resolvingNemesisAsViewer &&
    abilityFocusedPieceId !== null &&
    !pendingRecruitOfferIndex;

  const abilityOptionsAvailable = abilityFocusedPieceId
    ? hasLegalAbilityActions(game, abilityFocusedPieceId)
    : false;

  const acrobatFinishActions = useMemo(() => {
    if (!abilityFocusedPieceId) {
      return [] as GameLegalAction[];
    }
    if (game.pendingAbility?.abilityId === ACROBAT_PENDING_ABILITY_ID) {
      return abilityCompletionOnlyActions(game, abilityFocusedPieceId);
    }
    if (game.pendingAbility?.abilityId === LEADER_VIZIER_PENDING_ABILITY_ID) {
      return legalActionsForPiece(game, abilityFocusedPieceId, "DEFAULT_MOVE").filter(
        (action) => action.targetCellId == null,
      );
    }
    return [] as GameLegalAction[];
  }, [abilityFocusedPieceId, game]);

  const canSelectOwnPiece = useCallback(
    (pieceId: string) => {
      if (
        !canActInActionPhase ||
        game.phase !== "ACTION" ||
        isCommandPending ||
        isGameWon ||
        resolvingNemesisAsViewer
      ) {
        return false;
      }

      if (!isActivePlayer) {
        return false;
      }

      if (game.pendingAbility && game.pendingAbility.pieceId !== pieceId) {
        return false;
      }

      const piece = game.pieces?.[pieceId];
      if (!piece || !viewerColor || piece.owner !== viewerColor) {
        return false;
      }

      if (game.pendingAbility?.pieceId === pieceId) {
        return pieceHasLegalActions(game, pieceId);
      }

      if (hasPieceActedThisPhase(game, pieceId)) {
        return false;
      }

      return pieceHasLegalActions(game, pieceId);
    },
    [
      canActInActionPhase,
      game,
      isActivePlayer,
      isCommandPending,
      isGameWon,
      resolvingNemesisAsViewer,
      viewerColor,
    ],
  );

  const canDragPiece = useCallback(
    (pieceId: string) => {
      if (game.phase !== "ACTION" || isCommandPending || isGameWon || game.pendingAbility) {
        return false;
      }

      if (resolvingNemesisAsViewer && nemesisPieceId) {
        if (pieceId !== nemesisPieceId) {
          return false;
        }
        return legalDefaultMoveCellIds(game, pieceId).length > 0;
      }

      if (!canSelectOwnPiece(pieceId)) {
        return false;
      }

      if (
        abilityFocusedPieceId === pieceId &&
        hasLegalAbilityActions(game, pieceId)
      ) {
        return false;
      }

      if (
        abilityFocusedPieceId !== pieceId &&
        abilityTargets.pieceIds.includes(pieceId)
      ) {
        return false;
      }

      return legalDefaultMoveCellIds(game, pieceId).length > 0;
    },
    [
      abilityFocusedPieceId,
      abilityTargets.pieceIds,
      canSelectOwnPiece,
      game,
      isCommandPending,
      isGameWon,
      nemesisPieceId,
      resolvingNemesisAsViewer,
    ],
  );

  const boardCellClickHandler = useMemo(() => {
    if (isGameWon || isCommandPending) {
      return undefined;
    }

    if (
      game.phase === "RECRUITMENT" &&
      pendingRecruitOfferIndex !== null &&
      isActivePlayer
    ) {
      return onRecruitPlacementCell;
    }

    if (!canActInActionPhase) {
      return undefined;
    }

    if (game.phase === "ACTION") {
      return onActionBoardCell;
    }

    return undefined;
  }, [
    canActInActionPhase,
    game.phase,
    isActivePlayer,
    isCommandPending,
    isGameWon,
    onActionBoardCell,
    onRecruitPlacementCell,
    pendingRecruitOfferIndex,
  ]);

  const boardPieceHandlers = useMemo(() => {
    if (isGameWon || isCommandPending || !canActInActionPhase || game.phase !== "ACTION") {
      return {
        onPieceClick: undefined,
        onPieceDrop: undefined,
        onAbilityTargetPieceClick: undefined,
      };
    }

    return {
      onPieceClick: onAbilityPieceClick,
      onPieceDrop: onDefaultMoveDrop,
      onAbilityTargetPieceClick,
    };
  }, [
    canActInActionPhase,
    game.phase,
    isCommandPending,
    isGameWon,
    onAbilityPieceClick,
    onAbilityTargetPieceClick,
    onDefaultMoveDrop,
  ]);

  const watching = viewerColor === null;
  const seatColor = viewerColor ?? "BLACK";
  const opponent = opponentColor(seatColor);

  const actionHintText = (() => {
    if (resolvingNemesisAsViewer) {
      return "The enemy Leader moved — move Nemesis to any empty hex (drag or tap a highlight).";
    }
    if (game.resolvingNemesis && isActivePlayer) {
      return "Waiting for your opponent to move Nemesis…";
    }
    if (pendingHexAbilityChoice) {
      return "Tap a highlighted hex to choose where the enemy is pushed.";
    }
    if (abilityResolvingServerHexStep) {
      if (game.pendingAbility?.abilityId === LEADER_VIZIER_PENDING_ABILITY_ID) {
        return "Tap a highlighted hex for one more step, or stop after this step so your Vizier can still move.";
      }
      if (
        game.pendingAbility?.abilityId === ROYAL_GUARD_PENDING_ABILITY_ID &&
        game.pendingAbility.step === 1
      ) {
        return "Tap a highlighted hex for an optional extra step.";
      }
      return "Tap a highlighted empty hex to complete the ability.";
    }
    if (game.pendingAbility?.prompt) {
      return game.pendingAbility.prompt;
    }
    if (abilityAwaitingPieceTarget) {
      const focusedType =
        abilityFocusedPieceId !== null
          ? game.pieces?.[abilityFocusedPieceId]?.type
          : undefined;
      if (focusedType === "ROYAL_GUARD") {
        return "Tap your highlighted Leader, then choose an empty cell next to them.";
      }
      if (focusedType === "BRUISER") {
        return "Tap a highlighted enemy, then choose where they are pushed.";
      }
      if (focusedType === "ACROBAT") {
        if (game.pendingAbility?.abilityId === ACROBAT_PENDING_ABILITY_ID) {
          return "Tap a highlighted character to jump again, or finish the ability if you are done.";
        }
        return "Tap a highlighted character to jump over in a straight line.";
      }
      if (focusedType === "ILLUSIONIST") {
        return "Tap a highlighted ally or enemy to swap places.";
      }
      if (focusedType === "SHAMAN") {
        return "Tap a highlighted ally or enemy to turn them into a frog.";
      }
      return "Tap a highlighted character, then choose a destination hex.";
    }
    if (showAbilityHints && abilityOptionsAvailable) {
      return "Tap a highlighted hex or character to use the active ability. If a hex allows both move and ability, you will be asked to choose.";
    }
    if (showAbilityHints && !abilityOptionsAvailable) {
      return "Tap a highlighted hex to move.";
    }
    if (game.phase === "ACTION" && canActInActionPhase && isActivePlayer) {
      return "Tap a character to act, then tap a highlighted hex. Drag works when the character is not in ability mode.";
    }
    return null;
  })();

  const showPhaseContinueButton = showEndActionPhase && !isGameWon;
  const showActionHint =
    actionHintText !== null && pendingRecruitOfferIndex === null;

  return (
    <div className="relative flex h-full min-h-0 w-full flex-1 flex-col">
      <div className="pointer-events-none absolute left-2 top-2 z-30 sm:left-4 sm:top-4">
        <div className="pointer-events-auto game-hud-panel">
          <GameTurnStatus
            game={game}
            viewerColor={seatColor}
            roomMembers={roomMembers}
            watching={watching}
          />
        </div>
      </div>

      <div className="absolute right-2 top-2 z-20 sm:right-4 sm:top-4">
        <PlayerHandRow
          game={game}
          owner={opponent}
          viewerColor={seatColor}
          className="justify-end"
        />
      </div>

      <div className="absolute bottom-2 left-2 z-20 sm:bottom-4 sm:left-4">
        <PlayerHandRow
          game={game}
          owner={seatColor}
          viewerColor={seatColor}
          pendingRecruitPieceType={
            isActivePlayer ? pendingRecruitPieceType : null
          }
          className="justify-start"
        />
      </div>

      {pendingRecruitOfferIndex !== null && isActivePlayer ? (
        <p className="pointer-events-none absolute bottom-3 left-1/2 z-30 max-w-md -translate-x-1/2 text-center text-sm text-amber-200/90">
          Tap a highlighted border hex to place your recruit.
        </p>
      ) : null}

      {showActionHint && !showPhaseContinueButton ? (
        <p className="pointer-events-none absolute bottom-3 left-1/2 z-30 max-w-md -translate-x-1/2 text-center text-sm text-amber-200/90">
          {actionHintText}
        </p>
      ) : null}

      {acrobatFinishActions.length > 0 ? (
        <div className="pointer-events-none absolute bottom-14 left-1/2 z-40 flex -translate-x-1/2 gap-2">
          {acrobatFinishActions.map((action) => (
            <button
              key={action.actionKey}
              type="button"
              disabled={isCommandPending}
              onClick={() => onAbilityChoice(action.actionKey)}
              className="pointer-events-auto rounded-lg border border-zinc-600 px-3 py-1.5 text-sm text-zinc-200 hover:border-zinc-500"
            >
              {legalActionChoiceLabel(action) === "Use active ability"
                ? "Finish jump"
                : legalActionChoiceLabel(action)}
            </button>
          ))}
        </div>
      ) : null}

      {pendingHexAbilityChoice ? (
        <div className="pointer-events-none absolute bottom-14 left-1/2 z-40 -translate-x-1/2">
          <button
            type="button"
            disabled={isCommandPending}
            onClick={onDismissAbilityChoices}
            className="pointer-events-auto rounded-lg border border-zinc-600 px-3 py-1.5 text-sm text-zinc-300 hover:border-zinc-500"
          >
            Cancel
          </button>
        </div>
      ) : null}

      {showPhaseContinueButton ? (
        <div className="pointer-events-none absolute bottom-2 right-2 z-30 flex max-w-xs flex-col items-end gap-2 sm:bottom-4 sm:right-4 sm:max-w-sm">
          {showActionHint ? (
            <p className="text-right text-sm text-amber-200/90">{actionHintText}</p>
          ) : null}
          <button
            type="button"
            disabled={endActionPhaseDisabled}
            onClick={onEndActionPhase}
            className="pointer-events-auto game-phase-action rounded-lg border border-amber-500/60 bg-amber-500/15 px-4 py-2 text-sm font-medium text-amber-100 transition-colors duration-150 hover:border-amber-400 hover:bg-amber-500/25 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isCommandPending ? endActionPhasePendingLabel : endActionPhaseLabel}
          </button>
        </div>
      ) : null}

      <div className="relative min-h-0 flex-1">
        <div className="absolute inset-0 min-h-0 p-1 sm:p-2">
          <div className="relative h-full min-h-0 w-full">
          <HexGameBoard
            game={game}
            viewerColor={seatColor}
            moveHighlightCellIds={
              game.phase === "RECRUITMENT"
                ? placementHighlightCellIds
                : nemesisMoveHighlightCellIds.length > 0
                  ? nemesisMoveHighlightCellIds
                  : selectedPieceMoveHighlightCellIds
            }
            abilityHighlightCellIds={abilityTargets.cellIds}
            abilityHighlightPieceIds={abilityTargets.pieceIds}
            clickableCellIds={
              boardCellClickHandler ? boardClickableCellIds : undefined
            }
            onCellClick={boardCellClickHandler}
            canDragPiece={canDragPiece}
            canSelectOwnPiece={canSelectOwnPiece}
            {...boardPieceHandlers}
            className="h-full min-h-0"
          />

          {showRecruitmentOverlay ? (
            <RecruitmentOfferOverlay
              offers={game.faceUpOffers ?? []}
              canSelect={isActivePlayer}
              isSubmitting={isCommandPending}
              onSelectOffer={onSelectRecruitOffer}
            />
          ) : null}

          {pendingSameHexActionChoice && pendingAbilityChoices ? (
            <ActionChoiceOverlay
              choices={pendingAbilityChoices}
              isSubmitting={isCommandPending}
              onChoose={onAbilityChoice}
              onDismiss={onDismissAbilityChoices}
            />
          ) : null}
          </div>
        </div>
      </div>

      {showWinOverlay ? (
        <GameWinOverlay
          game={game}
          playerId={playerId}
          roomMembers={roomMembers}
          onDismiss={() => setWinOverlayDismissed(true)}
        />
      ) : null}
    </div>
  );
}
