"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

import { useGameDataTracker } from "@/leaders/features/game/use-game-data-tracker";
import { leadersPaths } from "@/leaders/paths";
import { useGameRealtime } from "@/leaders/features/game/use-game-realtime";
import {
  abilityChoicesAreDistinctHexTargets,
  findUniqueAbilityChoiceForCell,
  findUniqueLegalDefaultMoveAction,
  isLegalDefaultMove,
  matchingLegalAbilityActions,
  matchingLegalActionsForCell,
  pieceHasLegalActions,
} from "@/leaders/lib/game-legal-actions";
import {
  findNemesisPiece,
  hasPieceActedThisPhase,
  selectableActionPieceAtCell,
  viewerCanActInActionPhase,
  viewerColorFromPlayerId,
  viewerMustResolveNemesis,
} from "@/leaders/lib/game-view-model";
import { membershipMatchesRoomCode } from "@/leaders/lib/room-game-membership";
import { getStoredRoomMembership, setStoredRoomMembership } from "@/leaders/lib/room-storage";
import {
  getServerSnapshot,
  getSnapshot,
  membershipFromConnection,
  subscribe,
} from "@/leaders/services/room-connection";
import type { GameCommandRequest, GameLegalAction, GameStateView } from "@/leaders/services/game.types";
import type { RoomMembershipView } from "@/leaders/services/room.types";

export function useGamePage(roomCode: string) {
  const router = useRouter();
  const [membership, setMembership] = useState<RoomMembershipView | null>(null);
  const [membershipChecked, setMembershipChecked] = useState(false);
  const [membershipLiveReady, setMembershipLiveReady] = useState(false);
  const [game, setGame] = useState<GameStateView | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isCommandPending, setIsCommandPending] = useState(false);
  const [pendingRecruitOfferIndex, setPendingRecruitOfferIndex] = useState<number | null>(
    null,
  );
  const [selectedAbilityPieceId, setSelectedAbilityPieceId] = useState<string | null>(null);
  const [pendingAbilityChoices, setPendingAbilityChoices] = useState<GameLegalAction[] | null>(
    null,
  );
  const connection = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const seatPlayerId =
    connection && connection.code === roomCode.toUpperCase() ? connection.selfPlayerId : "";
  const playerId = seatPlayerId || null;

  const handleRealtimeGameState = useCallback((state: GameStateView) => {
    setGame(state);
    setLoadError(null);
  }, []);

  const handleSnapshotTimeout = useCallback(() => {
    setLoadError(
      "No game state arrived. The host may have disconnected.",
    );
  }, []);

  const realtime = useGameRealtime({
    membership,
    enabled: Boolean(membershipLiveReady && membership && membership.status === "IN_GAME"),
    onGameState: handleRealtimeGameState,
    onSnapshotTimeout: handleSnapshotTimeout,
  });

  const isLoading =
    Boolean(membership) &&
    !realtime.hasSnapshot &&
    realtime.connectionStatus !== "error";

  useGameDataTracker(game, playerId);

  useEffect(() => {
    let cancelled = false;

    const acceptMembership = (resolved: RoomMembershipView) => {
      setStoredRoomMembership(resolved);
      setMembership(resolved);
      setMembershipChecked(true);
      setMembershipLiveReady(resolved.status === "IN_GAME");
    };

    async function hydrateMembership() {
      let stored = getStoredRoomMembership();
      if (!membershipMatchesRoomCode(stored, roomCode)) {
        if (!cancelled) {
          setMembership(null);
          setMembershipChecked(true);
          setMembershipLiveReady(false);
          router.replace(leadersPaths.home);
        }
        return;
      }

      for (let attempt = 0; attempt < 40 && stored && stored.status !== "IN_GAME"; attempt++) {
        await new Promise((resolve) => window.setTimeout(resolve, 50));
        if (cancelled) {
          return;
        }
        stored = getStoredRoomMembership();
        if (!membershipMatchesRoomCode(stored, roomCode)) {
          if (!cancelled) {
            setMembership(null);
            setMembershipChecked(true);
            setMembershipLiveReady(false);
            router.replace(leadersPaths.home);
          }
          return;
        }
      }

      if (!stored || stored.status !== "IN_GAME") {
        if (!cancelled && stored) {
          setMembershipChecked(true);
          setMembershipLiveReady(false);
          router.replace(leadersPaths.room(stored.code));
        }
        return;
      }

      const resolved = stored;

      if (!cancelled) {
        acceptMembership(resolved);
      }
    }

    setMembershipLiveReady(false);
    void hydrateMembership();

    return () => {
      cancelled = true;
    };
  }, [roomCode, router]);

  useEffect(() => {
    if (!connection || connection.code !== roomCode.toUpperCase()) {
      return;
    }
    if (connection.roomStatus !== "LOBBY") {
      return;
    }

    const next = membershipFromConnection(connection);
    setStoredRoomMembership(next);
    router.replace(leadersPaths.room(next.code));
  }, [connection, roomCode, router]);

  useEffect(() => {
    if (game?.phase !== "RECRUITMENT") {
      setPendingRecruitOfferIndex(null);
    }
    if (game?.phase !== "ACTION") {
      setSelectedAbilityPieceId(null);
      setPendingAbilityChoices(null);
    }
  }, [game?.phase, game?.version]);

  useEffect(() => {
    if (game?.pendingAbility) {
      setSelectedAbilityPieceId(game.pendingAbility.pieceId);
      return;
    }

    if (
      selectedAbilityPieceId &&
      game &&
      hasPieceActedThisPhase(game, selectedAbilityPieceId)
    ) {
      setSelectedAbilityPieceId(null);
      setPendingAbilityChoices(null);
    }
  }, [
    game,
    game?.actedThisPhase,
    game?.pendingAbility?.pieceId,
    game?.version,
    selectedAbilityPieceId,
  ]);

  useEffect(() => {
    if (!game?.resolvingNemesis) {
      return;
    }
    setSelectedAbilityPieceId(null);
    setPendingAbilityChoices(null);
  }, [game?.resolvingNemesis, game?.version]);

  useEffect(() => {
    if (realtime.connectionError) {
      setLoadError(realtime.connectionError);
    }
  }, [realtime.connectionError]);

  const submitGameCommand = useCallback(
    (command: GameCommandRequest) => realtime.sendCommand(command),
    [realtime],
  );

  const handleSelectRecruitOffer = useCallback((offerIndex: number) => {
    setPendingRecruitOfferIndex(offerIndex);
  }, []);

  const effectiveAbilityPieceId =
    game?.pendingAbility?.pieceId ?? selectedAbilityPieceId;

  const runAbilityAction = useCallback(
    async (action: GameLegalAction) => {
      if (!game || game.phase !== "ACTION" || isCommandPending) {
        return;
      }

      setIsCommandPending(true);
      setLoadError(null);
      setPendingAbilityChoices(null);

      try {
        const next = await submitGameCommand({
          type: "ACTIVE_ABILITY",
          expectedVersion: game.version,
          actionKey: action.actionKey,
        });
        setGame(next);
        if (!next.pendingAbility) {
          setSelectedAbilityPieceId(null);
        }
      } catch (caught) {
        if (caught instanceof Error) {
          setLoadError(caught.message);
        } else {
          setLoadError("Could not use that ability.");
        }
      } finally {
        setIsCommandPending(false);
      }
    },
    [game, isCommandPending, submitGameCommand],
  );

  const runLegalAction = useCallback(
    async (action: GameLegalAction) => {
      if (!game || game.phase !== "ACTION" || isCommandPending) {
        return;
      }

      if (action.type === "ACTIVE_ABILITY") {
        await runAbilityAction(action);
        return;
      }

      setIsCommandPending(true);
      setLoadError(null);
      setPendingAbilityChoices(null);
      setSelectedAbilityPieceId(null);

      try {
        const next = await submitGameCommand({
          type: "DEFAULT_MOVE",
          expectedVersion: game.version,
          actionKey: action.actionKey,
        });
        setGame(next);
      } catch (caught) {
        if (caught instanceof Error) {
          setLoadError(caught.message);
        } else {
          setLoadError("Could not move that character.");
        }
      } finally {
        setIsCommandPending(false);
      }
    },
    [game, isCommandPending, runAbilityAction, submitGameCommand],
  );

  const resolveLegalTarget = useCallback(
    async (pieceId: string, cellId: number, targetPieceId?: string) => {
      if (!game || game.phase !== "ACTION" || isCommandPending) {
        return;
      }

      const actions =
        targetPieceId !== undefined
          ? matchingLegalAbilityActions(game, pieceId, cellId, targetPieceId)
          : matchingLegalActionsForCell(game, pieceId, cellId);

      if (actions.length > 1) {
        setPendingAbilityChoices(actions);
        return;
      }

      if (actions.length === 1 && actions[0]) {
        await runLegalAction(actions[0]);
      }
    },
    [game, isCommandPending, runLegalAction],
  );

  const handleAbilityPieceClick = useCallback(
    (pieceId: string) => {
      if (
        !game ||
        game.phase !== "ACTION" ||
        isCommandPending ||
        game.pendingAbility ||
        game.resolvingNemesis
      ) {
        return;
      }

      const viewerColor = viewerColorFromPlayerId(game, playerId);
      if (!viewerColor || game.activeColor !== viewerColor) {
        return;
      }

      const piece = game.pieces?.[pieceId];
      if (!piece || piece.owner !== viewerColor) {
        return;
      }

      const selectable = selectableActionPieceAtCell(game, viewerColor, piece.cellId);
      if (!selectable || selectable.id !== pieceId) {
        return;
      }

      if (selectedAbilityPieceId === pieceId) {
        setSelectedAbilityPieceId(null);
        setPendingAbilityChoices(null);
        return;
      }

      setPendingAbilityChoices(null);

      if (!pieceHasLegalActions(game, pieceId)) {
        return;
      }

      setSelectedAbilityPieceId(pieceId);
    },
    [game, isCommandPending, playerId, selectedAbilityPieceId],
  );

  const handleDefaultMoveDrop = useCallback(
    async (pieceId: string, targetCellId: number) => {
      if (!game || game.phase !== "ACTION" || isCommandPending) {
        return;
      }

      const viewerColor = viewerColorFromPlayerId(game, playerId);
      if (!viewerColor || !viewerCanActInActionPhase(game, viewerColor)) {
        return;
      }

      if (game.pendingAbility) {
        return;
      }

      if (game.resolvingNemesis) {
        const nemesis = findNemesisPiece(game, viewerColor);
        if (!nemesis || pieceId !== nemesis.id) {
          return;
        }
      } else if (game.activeColor !== viewerColor) {
        return;
      }

      const cellActions = matchingLegalActionsForCell(game, pieceId, targetCellId);
      if (cellActions.length === 0) {
        if (!isLegalDefaultMove(game, pieceId, targetCellId)) {
          return;
        }

        const legalDefaultAction = findUniqueLegalDefaultMoveAction(
          game,
          pieceId,
          targetCellId,
        );

        setIsCommandPending(true);
        setLoadError(null);
        setPendingAbilityChoices(null);
        setSelectedAbilityPieceId(null);

        try {
          const next = await submitGameCommand(
            legalDefaultAction
              ? {
                  type: "DEFAULT_MOVE",
                  expectedVersion: game.version,
                  actionKey: legalDefaultAction.actionKey,
                }
              : {
                  type: "DEFAULT_MOVE",
                  expectedVersion: game.version,
                  pieceId,
                  targetCellId,
                },
          );
          setGame(next);
        } catch (caught) {
          if (caught instanceof Error) {
            setLoadError(caught.message);
          } else {
            setLoadError("Could not move that character.");
          }
        } finally {
          setIsCommandPending(false);
        }
        return;
      }

      await resolveLegalTarget(pieceId, targetCellId);
    },
    [game, isCommandPending, playerId, resolveLegalTarget, submitGameCommand],
  );

  const handleAbilityTargetClick = useCallback(
    async (cellId: number, targetPieceId?: string) => {
      if (!game || game.phase !== "ACTION" || isCommandPending) {
        return;
      }

      const viewerColor = viewerColorFromPlayerId(game, playerId);
      if (!viewerColor || game.activeColor !== viewerColor) {
        return;
      }

      const abilityPieceId = effectiveAbilityPieceId;
      if (!abilityPieceId) {
        return;
      }

      await resolveLegalTarget(abilityPieceId, cellId, targetPieceId);
    },
    [effectiveAbilityPieceId, game, isCommandPending, playerId, resolveLegalTarget],
  );

  const handleAbilityChoice = useCallback(
    (actionKey: string) => {
      if (!game) {
        return;
      }

      const action =
        pendingAbilityChoices?.find((entry) => entry.actionKey === actionKey) ??
        game.legalActions?.find((entry) => entry.actionKey === actionKey);
      if (!action) {
        return;
      }

      void runLegalAction(action);
    },
    [game, pendingAbilityChoices, runLegalAction],
  );

  const dismissAbilityChoices = useCallback(() => {
    setPendingAbilityChoices(null);
  }, []);

  const handleActionBoardCell = useCallback(
    async (cellId: number) => {
      if (!game || game.phase !== "ACTION" || isCommandPending) {
        return;
      }

      const viewerColor = viewerColorFromPlayerId(game, playerId);
      if (!viewerColor) {
        return;
      }

      if (
        pendingAbilityChoices &&
        abilityChoicesAreDistinctHexTargets(pendingAbilityChoices)
      ) {
        const action = findUniqueAbilityChoiceForCell(pendingAbilityChoices, cellId);
        if (action) {
          await runLegalAction(action);
        }
        return;
      }

      if (effectiveAbilityPieceId) {
        await handleAbilityTargetClick(cellId);
        return;
      }

      if (viewerMustResolveNemesis(game, viewerColor)) {
        const nemesis = findNemesisPiece(game, viewerColor);
        if (nemesis && isLegalDefaultMove(game, nemesis.id, cellId)) {
          await handleDefaultMoveDrop(nemesis.id, cellId);
        }
        return;
      }

      setPendingAbilityChoices(null);
    },
    [
      effectiveAbilityPieceId,
      game,
      handleAbilityTargetClick,
      handleDefaultMoveDrop,
      isCommandPending,
      pendingAbilityChoices,
      playerId,
      runLegalAction,
    ],
  );

  const handleEndActionPhase = useCallback(async () => {
    if (!game || game.phase !== "ACTION" || isCommandPending) {
      return;
    }

    const viewerColor = viewerColorFromPlayerId(game, playerId);
    if (!viewerColor || game.activeColor !== viewerColor || game.resolvingNemesis) {
      return;
    }

    setIsCommandPending(true);
    setLoadError(null);
    setSelectedAbilityPieceId(null);
    setPendingAbilityChoices(null);

    try {
      const next = await submitGameCommand({
        type: "END_ACTION_PHASE",
        expectedVersion: game.version,
      });
      setGame(next);
    } catch (caught) {
      if (caught instanceof Error) {
        setLoadError(caught.message);
      } else {
        setLoadError("Could not end the action phase.");
      }
    } finally {
      setIsCommandPending(false);
    }
  }, [game, isCommandPending, playerId, submitGameCommand]);

  const handleRecruitPlacementCell = useCallback(
    async (cellId: number) => {
      if (!game || pendingRecruitOfferIndex === null || isCommandPending) {
        return;
      }

      setIsCommandPending(true);
      setLoadError(null);

      try {
        const next = await submitGameCommand({
          type: "RECRUIT",
          expectedVersion: game.version,
          offerIndex: pendingRecruitOfferIndex,
          targetCellId: cellId,
        });
        setGame(next);
        setPendingRecruitOfferIndex(null);
      } catch (caught) {
        if (caught instanceof Error) {
          setLoadError(caught.message);
        } else {
          setLoadError("Could not complete recruitment.");
        }
      } finally {
        setIsCommandPending(false);
      }
    },
    [game, isCommandPending, pendingRecruitOfferIndex, submitGameCommand],
  );

  return {
    membership,
    membershipChecked,
    game,
    loadError,
    isLoading,
    isCommandPending,
    pendingRecruitOfferIndex,
    selectedAbilityPieceId: effectiveAbilityPieceId,
    pendingAbilityChoices,
    playerId,
    gameRealtimeStatus: realtime.connectionStatus,
    handleSelectRecruitOffer,
    handleRecruitPlacementCell,
    handleActionBoardCell,
    handleAbilityPieceClick,
    handleDefaultMoveDrop,
    handleAbilityTargetClick,
    handleAbilityChoice,
    dismissAbilityChoices,
    handleEndActionPhase,
    requestGameSnapshot: realtime.requestSnapshot,
  };
}
