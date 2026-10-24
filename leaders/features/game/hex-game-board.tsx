"use client";

import { useCallback, useRef, useState } from "react";

import {
  CharacterAbilityHoverTooltip,
  computeAbilityTooltipAnchor,
  type AbilityTooltipAnchor,
} from "@/leaders/features/game/character-ability-hover-tooltip";
import {
  BLACK_CROWN_CELL_ID,
  BOARD_CELLS,
  flatTopHexPoints,
  getBoardCellCenter,
  WHITE_CROWN_CELL_ID,
} from "@/leaders/lib/board-config";
import { boardPointFromSvgPointer, nearestBoardCellId } from "@/leaders/lib/board-hit-test";
import { isLegalDefaultMove, legalDefaultMoveCellIds } from "@/leaders/lib/game-legal-actions";
import {
  boardTiltDegrees,
  displayCellId,
  displayPieceColor,
  sourceCellId,
} from "@/leaders/lib/board-presentation";
import { characterPortraitPath } from "@/leaders/lib/character-metadata";
import { pieceAtCell } from "@/leaders/lib/game-view-model";
import {
  formatPieceTypeName,
  pieceOwnerTokenBackground,
} from "@/leaders/lib/piece-display";
import type { GameStateView, PieceColor, PieceType } from "@/leaders/services/game.types";

const HEX_RADIUS = 26;
const DRAG_THRESHOLD_PX = 8;
/** Inset used when drawing cell polygons (matches previous cell stroke inset). */
const CELL_HEX_RADIUS = HEX_RADIUS - 2;
/** Token hex: same flat-top orientation as cells, slightly inset inside the cell. */
const PIECE_HEX_RADIUS = CELL_HEX_RADIUS * 0.88;
const PIECE_HEX_WIDTH = PIECE_HEX_RADIUS * 2;
const PIECE_HEX_HEIGHT = PIECE_HEX_RADIUS * Math.sqrt(3);

/** Matches secondary CTA: bg-amber-500/15, border-amber-500/60 */
const HIGHLIGHT_MOVE_FILL = "rgb(245 158 11 / 0.15)";
const HIGHLIGHT_MOVE_STROKE = "rgb(245 158 11 / 0.6)";

const HIGHLIGHT_ABILITY_FILL = "rgb(52 211 153 / 0.12)";
const HIGHLIGHT_ABILITY_STROKE = "rgb(52 211 153 / 0.55)";

const HIGHLIGHT_ABILITY_PIECE_STROKE = "rgb(52 211 153 / 0.85)";

interface HexGameBoardProps {
  game: GameStateView;
  viewerColor: PieceColor;
  moveHighlightCellIds?: readonly number[];
  abilityHighlightCellIds?: readonly number[];
  abilityHighlightPieceIds?: readonly string[];
  /** When set, only these server cell ids accept clicks (must match `onCellClick`). */
  clickableCellIds?: readonly number[];
  onCellClick?: (cellId: number) => void;
  onPieceClick?: (pieceId: string, cellId: number) => void;
  onPieceDrop?: (pieceId: string, targetCellId: number) => void;
  onAbilityTargetPieceClick?: (cellId: number, targetPieceId: string) => void;
  canDragPiece?: (pieceId: string) => boolean;
  canSelectOwnPiece?: (pieceId: string) => boolean;
  className?: string;
}

export function HexGameBoard({
  game,
  viewerColor,
  moveHighlightCellIds = [],
  abilityHighlightCellIds = [],
  abilityHighlightPieceIds = [],
  clickableCellIds,
  onCellClick,
  onPieceClick,
  onPieceDrop,
  onAbilityTargetPieceClick,
  canDragPiece,
  canSelectOwnPiece,
  className = "",
}: HexGameBoardProps) {
  const showAbilityOnHover = game.phase === "ACTION";
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoveredPiece, setHoveredPiece] = useState<{
    pieceType: PieceType;
    anchor: AbilityTooltipAnchor;
  } | null>(null);

  const [dragState, setDragState] = useState<{
    pieceId: string;
    sourceCellId: number;
    pointerId: number;
    startClientX: number;
    startClientY: number;
    isDragging: boolean;
  } | null>(null);

  const moveHighlightSet = new Set(
    moveHighlightCellIds.length > 0
      ? moveHighlightCellIds
      : dragState
        ? legalDefaultMoveCellIds(game, dragState.pieceId)
        : [],
  );
  const abilityHighlightSet = new Set(abilityHighlightCellIds);
  const abilityPieceHighlightSet = new Set(abilityHighlightPieceIds);
  const clickableCellSet =
    clickableCellIds !== undefined ? new Set(clickableCellIds) : null;

  const hexPoints = flatTopHexPoints(CELL_HEX_RADIUS);
  const pieceHexPoints = flatTopHexPoints(PIECE_HEX_RADIUS);
  const tilt = boardTiltDegrees(viewerColor, HEX_RADIUS);
  const portraitCounterRotateDeg = tilt !== 0 ? -tilt : 0;
  const crownCounterRotate = tilt !== 0 ? ` rotate(${-tilt})` : "";

  const finishDrag = useCallback(
    (clientX: number, clientY: number) => {
      if (!dragState || !dragState.isDragging || !svgRef.current || !onPieceDrop) {
        setDragState(null);
        return;
      }

      const { x, y } = boardPointFromSvgPointer(svgRef.current, clientX, clientY);
      const targetCellId = nearestBoardCellId(x, y, HEX_RADIUS, viewerColor);
      if (
        targetCellId !== null &&
        isLegalDefaultMove(game, dragState.pieceId, targetCellId)
      ) {
        onPieceDrop(dragState.pieceId, targetCellId);
      }
      setDragState(null);
    },
    [dragState, game, onPieceDrop, viewerColor],
  );

  const handlePiecePointerDown = useCallback(
    (
      event: React.PointerEvent,
      pieceId: string,
      sourceCellId: number,
      isOwnPiece: boolean,
    ) => {
      event.stopPropagation();
      if (!isOwnPiece) {
        return;
      }

      if (!canDragPiece?.(pieceId) && !canSelectOwnPiece?.(pieceId)) {
        return;
      }

      if (event.button !== 0) {
        return;
      }

      setDragState({
        pieceId,
        sourceCellId,
        pointerId: event.pointerId,
        startClientX: event.clientX,
        startClientY: event.clientY,
        isDragging: false,
      });
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [canDragPiece, canSelectOwnPiece],
  );

  const handlePiecePointerMove = useCallback(
    (event: React.PointerEvent) => {
      if (!dragState || event.pointerId !== dragState.pointerId) {
        return;
      }

      event.stopPropagation();
      const dx = event.clientX - dragState.startClientX;
      const dy = event.clientY - dragState.startClientY;
      if (
        !dragState.isDragging &&
        canDragPiece?.(dragState.pieceId) &&
        Math.hypot(dx, dy) >= DRAG_THRESHOLD_PX
      ) {
        setDragState({ ...dragState, isDragging: true });
      }
    },
    [dragState],
  );

  const handlePiecePointerUp = useCallback(
    (
      event: React.PointerEvent,
      pieceId: string,
      sourceCellId: number,
      isOwnPiece: boolean,
      isAbilityTarget: boolean,
    ) => {
      if (!dragState || event.pointerId !== dragState.pointerId) {
        return;
      }

      event.stopPropagation();
      event.currentTarget.releasePointerCapture(event.pointerId);

      if (dragState.isDragging) {
        finishDrag(event.clientX, event.clientY);
        return;
      }

      setDragState(null);

      if (isAbilityTarget && onAbilityTargetPieceClick) {
        onAbilityTargetPieceClick(sourceCellId, pieceId);
        return;
      }

      if (isOwnPiece && onPieceClick) {
        onPieceClick(pieceId, sourceCellId);
      }
    },
    [dragState, finishDrag, onAbilityTargetPieceClick, onPieceClick],
  );

  const handlePiecePointerCancel = useCallback((event: React.PointerEvent) => {
    if (!dragState || event.pointerId !== dragState.pointerId) {
      return;
    }
    event.stopPropagation();
    setDragState(null);
  }, [dragState]);

  return (
    <div className={`flex h-full min-h-0 w-full ${className ?? ""}`}>
      <svg
        ref={svgRef}
        viewBox="-200 -170 400 340"
        className="h-full min-h-0 w-full"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Hex game board"
      >
        <defs>
          <clipPath id="piece-token-hex">
            <polygon points={pieceHexPoints} />
          </clipPath>
        </defs>
        <g transform={tilt !== 0 ? `rotate(${tilt})` : undefined}>
          {BOARD_CELLS.map((cell) => {
            const shownId = displayCellId(cell.id, viewerColor);
            const sourceId = sourceCellId(shownId, viewerColor);
            const { x, y } = getBoardCellCenter(shownId, HEX_RADIUS);
            const piece = pieceAtCell(game, sourceId);
            const isCrown =
              sourceId === WHITE_CROWN_CELL_ID || sourceId === BLACK_CROWN_CELL_ID;
            const isMoveHighlighted = moveHighlightSet.has(sourceId);
            const isAbilityHighlighted = abilityHighlightSet.has(sourceId);

            let cellFill: string | undefined;
            let cellStroke: string | undefined;
            if (isMoveHighlighted && isAbilityHighlighted) {
              cellFill = HIGHLIGHT_MOVE_FILL;
              cellStroke = HIGHLIGHT_ABILITY_STROKE;
            } else if (isMoveHighlighted) {
              cellFill = HIGHLIGHT_MOVE_FILL;
              cellStroke = HIGHLIGHT_MOVE_STROKE;
            } else if (isAbilityHighlighted) {
              cellFill = HIGHLIGHT_ABILITY_FILL;
              cellStroke = HIGHLIGHT_ABILITY_STROKE;
            }

            const isCellClickable =
              onCellClick !== undefined &&
              (clickableCellSet === null || clickableCellSet.has(sourceId));

            const isAbilityTargetPiece =
              piece !== null &&
              (abilityPieceHighlightSet.has(piece.id) || isAbilityHighlighted);

            return (
              <g
                key={cell.id}
                transform={`translate(${x} ${y})`}
                className={isCellClickable ? "cursor-pointer" : undefined}
                onClick={isCellClickable ? () => onCellClick(sourceId) : undefined}
              >
                <polygon
                  points={hexPoints}
                  fill={cellFill}
                  stroke={cellStroke}
                  className={
                    cellFill
                      ? "transition-colors"
                      : `fill-zinc-900/90 stroke-zinc-600 transition-colors ${
                          isCrown ? "stroke-amber-500/70" : ""
                        }`
                  }
                  strokeWidth={cellFill ? 2.5 : 1.2}
                />
                {isCrown ? (
                  <text
                    y={4}
                    textAnchor="middle"
                    className="fill-amber-400/90 text-[10px] font-semibold uppercase tracking-wider"
                    style={{ fontSize: "9px" }}
                    transform={crownCounterRotate.trim() || undefined}
                  >
                    ♛
                  </text>
                ) : null}
                {piece ? (
                  <g
                    onPointerDown={
                      piece.owner === viewerColor
                        ? (event) =>
                            handlePiecePointerDown(
                              event,
                              piece.id,
                              sourceId,
                              true,
                            )
                        : undefined
                    }
                    onPointerMove={
                      piece.owner === viewerColor ? handlePiecePointerMove : undefined
                    }
                    onPointerUp={
                      piece.owner === viewerColor
                        ? (event) =>
                            handlePiecePointerUp(
                              event,
                              piece.id,
                              sourceId,
                              true,
                              isAbilityTargetPiece,
                            )
                        : isAbilityTargetPiece && onAbilityTargetPieceClick
                          ? (event) => {
                              event.stopPropagation();
                              onAbilityTargetPieceClick(sourceId, piece.id);
                            }
                          : undefined
                    }
                    onPointerCancel={
                      piece.owner === viewerColor ? handlePiecePointerCancel : undefined
                    }
                    onMouseEnter={(event) => {
                      if (!showAbilityOnHover) {
                        return;
                      }

                      setHoveredPiece({
                        pieceType: piece.type,
                        anchor: computeAbilityTooltipAnchor(event.currentTarget),
                      });
                    }}
                    onMouseLeave={() => {
                      if (!showAbilityOnHover) {
                        return;
                      }

                      setHoveredPiece(null);
                    }}
                    onClick={(event) => {
                      event.stopPropagation();
                    }}
                    className={
                      piece.owner === viewerColor &&
                      (canDragPiece?.(piece.id) || canSelectOwnPiece?.(piece.id))
                        ? canDragPiece?.(piece.id)
                          ? "cursor-grab active:cursor-grabbing"
                          : "cursor-pointer"
                        : isAbilityTargetPiece
                          ? "cursor-pointer"
                          : undefined
                    }
                  >
                    <g clipPath="url(#piece-token-hex)">
                      <polygon
                        points={pieceHexPoints}
                        fill={pieceOwnerTokenBackground(
                          displayPieceColor(piece.owner, viewerColor),
                        )}
                      />
                      <g
                        transform={
                          portraitCounterRotateDeg !== 0
                            ? `rotate(${portraitCounterRotateDeg})`
                            : undefined
                        }
                      >
                        <image
                          href={characterPortraitPath(piece.type, { frog: piece.frog })}
                          x={-PIECE_HEX_WIDTH / 2}
                          y={-PIECE_HEX_HEIGHT / 2}
                          width={PIECE_HEX_WIDTH}
                          height={PIECE_HEX_HEIGHT}
                          preserveAspectRatio="xMidYMid meet"
                          pointerEvents="none"
                        />
                      </g>
                    </g>
                    <polygon
                      points={pieceHexPoints}
                      fill="transparent"
                      stroke={
                        isAbilityTargetPiece
                          ? HIGHLIGHT_ABILITY_PIECE_STROKE
                          : "none"
                      }
                      strokeWidth={isAbilityTargetPiece ? 2.5 : 0}
                      pointerEvents="all"
                    />
                    <title>{formatPieceTypeName(piece.type)}</title>
                  </g>
                ) : null}
              </g>
            );
          })}
        </g>
      </svg>

      {hoveredPiece ? (
        <CharacterAbilityHoverTooltip
          pieceType={hoveredPiece.pieceType}
          anchor={hoveredPiece.anchor}
        />
      ) : null}
    </div>
  );
}
