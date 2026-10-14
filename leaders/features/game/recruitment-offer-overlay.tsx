"use client";

import { CharacterCard } from "@/leaders/features/game/character-card";
import type { PieceType } from "@/leaders/services/game.types";

interface RecruitmentOfferOverlayProps {
  offers: PieceType[];
  canSelect: boolean;
  isSubmitting: boolean;
  onSelectOffer: (offerIndex: number) => void;
}

export function RecruitmentOfferOverlay({
  offers,
  canSelect,
  isSubmitting,
  onSelectOffer,
}: RecruitmentOfferOverlayProps) {
  if (offers.length === 0) {
    return null;
  }

  return (
    <div
      className="overlay absolute inset-0 z-20 flex flex-col items-center justify-start overflow-y-auto px-4 pt-6 sm:pt-10"
      role="dialog"
      aria-modal="true"
      aria-labelledby="recruitment-offer-title"
    >
      <p
        id="recruitment-offer-title"
        className="text-base font-semibold text-zinc-50"
      >
        Recruitment
      </p>
      <p className="mt-2 max-w-md text-center text-sm text-zinc-200">
        {canSelect
          ? "Choose a character to recruit."
          : "Waiting for your opponent to recruit…"}
      </p>

      <div className="mt-6 flex max-w-5xl flex-wrap items-start justify-center gap-6 pb-8">
        {offers.map((offer, index) => (
          <button
            key={`${offer}-${index}`}
            type="button"
            disabled={!canSelect || isSubmitting}
            onClick={() => onSelectOffer(index)}
            className={`offer-choice rounded-xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400 ${
              canSelect && !isSubmitting
                ? ""
                : "cursor-not-allowed opacity-80"
            }`}
          >
            <CharacterCard pieceType={offer} showAbilityDescription />
          </button>
        ))}
      </div>
    </div>
  );
}
