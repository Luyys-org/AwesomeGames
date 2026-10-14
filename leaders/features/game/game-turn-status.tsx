import {
  displayUsernameForPlayerId,
  formatGamePhaseLabel,
} from "@/leaders/lib/game-view-model";
import type { GameStateView, PieceColor } from "@/leaders/services/game.types";
import type { RoomMemberView } from "@/leaders/services/room.types";

interface GameTurnStatusProps {
  game: GameStateView;
  viewerColor: PieceColor;
  roomMembers?: RoomMemberView[];
  watching?: boolean;
}

export function GameTurnStatus({
  game,
  viewerColor,
  roomMembers,
  watching = false,
}: GameTurnStatusProps) {
  if (game.status === "WON") {
    const winnerName = displayUsernameForPlayerId(game.winnerPlayerId, game, roomMembers);

    return (
      <div className="panel panel-accent px-4 py-2 text-left">
        <p className="text-sm font-medium text-amber-100">{winnerName} wins</p>
        <p className="mt-0.5 text-xs text-zinc-400">Final round {game.turnNumber}</p>
      </div>
    );
  }

  const isYourTurn = game.activeColor === viewerColor;
  const activePlayerId = game.activeColor === "BLACK" ? game.blackPlayerId : game.whitePlayerId;
  const turnLabel = (() => {
    if (watching) {
      return `${displayUsernameForPlayerId(activePlayerId, game, roomMembers)}'s turn`;
    }
    if (game.phase === "ACTION" && game.resolvingNemesis) {
      if (isYourTurn) {
        return "Waiting for Nemesis";
      }
      return "Move Nemesis";
    }
    return isYourTurn ? "Your turn" : "Opponent's turn";
  })();
  const phaseLabel = formatGamePhaseLabel(game.phase);

  return (
    <div className="panel px-4 py-2 text-left">
      <p className="text-sm font-medium text-zinc-100">
        <span key={`${game.phase}-${game.turnNumber}-${turnLabel}`} className="game-hud-label">
          {turnLabel}
        </span>
        <span className="text-zinc-500"> · </span>
        <span key={game.phase} className="game-hud-label">
          {phaseLabel}
        </span>
      </p>
      <p className="mt-0.5 text-xs text-zinc-500">
        <span key={game.turnNumber} className="game-hud-label">
          Turn {game.turnNumber}
        </span>
      </p>
    </div>
  );
}
