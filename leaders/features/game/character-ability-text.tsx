import { characterAbilityCopy } from "@/leaders/lib/character-metadata";
import type { PieceType } from "@/leaders/services/game.types";

interface CharacterAbilityTextProps {
  pieceType: PieceType;
  className?: string;
  centered?: boolean;
}

export function CharacterAbilityText({
  pieceType,
  className = "",
  centered = false,
}: CharacterAbilityTextProps) {
  const { summary, rules } = characterAbilityCopy(pieceType);

  return (
    <div className={`${centered ? "text-center" : "text-left"} ${className}`.trim()}>
      <p className="text-xs leading-snug text-zinc-200">{summary}</p>
      {rules.length > 0 ? (
        <ul className="mt-1.5 list-none space-y-0.5">
          {rules.map((rule) => (
            <li key={rule} className="text-[10px] leading-snug text-zinc-500">
              {rule}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
