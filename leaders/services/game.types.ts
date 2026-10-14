export interface ReadyRequest {
  ready: boolean;
}

export type GameStatus = "IN_PROGRESS" | "WON";

export type GamePhase = "ACTION" | "RECRUITMENT";

export type PieceColor = "BLACK" | "WHITE";

export type PieceType =
  | "LEADER"
  | "SHAMAN"
  | "SNIPER"
  | "TACTICIAN"
  | "WILL_O_THE_WISP"
  | "ACROBAT"
  | "RIDER"
  | "BRUISER"
  | "ROYAL_GUARD"
  | "ILLUSIONIST"
  | "CLAW_LAUNCHER"
  | "MANIPULATOR"
  | "WANDERER"
  | "BREWMASTER"
  | "ARCHER"
  | "ASSASSIN"
  | "JAILOR"
  | "PROTECTOR"
  | "VIZIER"
  | "NEMESIS"
  | "HERMIT"
  | "CUB";

export type GameCommandType =
  | "DEFAULT_MOVE"
  | "END_ACTION_PHASE"
  | "RECRUIT"
  | "ACTIVE_ABILITY";

export interface GameCommandRequest {
  type: GameCommandType;
  expectedVersion: number;
  pieceId?: string;
  targetCellId?: number;
  offerIndex?: number;
  /** Prefer for ACTIVE_ABILITY when the server publishes legalActions. */
  actionKey?: string;
  abilityParams?: Record<string, unknown>;
}

export type GameLegalActionType = "DEFAULT_MOVE" | "ACTIVE_ABILITY";

export interface GameLegalAction {
  /** Opaque id; client sends this back on ACTIVE_ABILITY. */
  actionKey: string;
  type: GameLegalActionType;
  pieceId: string;
  targetCellId?: number;
  targetPieceId?: string;
  label?: string;
  choiceGroup?: string;
}

export interface GamePendingAbility {
  pieceId: string;
  abilityId: string;
  step: number;
  prompt?: string;
}

export interface BoardPiece {
  id: string;
  type: PieceType;
  owner: PieceColor;
  cellId: number;
  frog: boolean;
}

export interface GameStateView {
  gameId: string;
  roomId: string;
  version: number;
  status: GameStatus;
  winnerPlayerId?: string | null;
  blackPlayerId: string;
  whitePlayerId: string;
  activeColor: PieceColor;
  firstPlayerColor: PieceColor;
  turnNumber: number;
  phase: GamePhase;
  recruitmentPhasesRemaining?: number;
  cellToPiece?: Record<string, string>;
  pieces?: Record<string, BoardPiece>;
  faceUpOffers?: PieceType[];
  deck?: PieceType[];
  blackHand?: PieceType[];
  whiteHand?: PieceType[];
  actedThisPhase?: string[];
  frogExpiresAfterOpponentTurn?: Record<string, number>;
  resolvingNemesis?: boolean;
  /** Legal moves and ability targets during ACTION (Nemesis-only while resolvingNemesis). */
  legalActions?: GameLegalAction[];
  /** Set while a multi-step active ability is being resolved. */
  pendingAbility?: GamePendingAbility | null;
}
