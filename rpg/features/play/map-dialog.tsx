import type { RoomMapDoorLabel, RoomMapWall } from "@/rpg/lib/room-map";

interface MapDialogProps {
  place: string;
  imageUrl: string | null;
  busy: boolean;
  doors: RoomMapDoorLabel[];
  onClose: () => void;
}

const WALL_LABELS: Record<RoomMapWall, string> = {
  north: "North",
  east: "East",
  south: "South",
  west: "West",
};

export function MapDialog({ place, imageUrl, busy, doors, onClose }: MapDialogProps) {
  const title = place.length > 0 ? place : "Map";

  return (
    <div className="overlay fixed inset-0 z-50 flex items-center justify-center px-4">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close map"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="map-heading"
        className="panel relative z-10 max-h-[80vh] w-full max-w-lg overflow-y-auto p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <h2 id="map-heading" className="text-xl font-semibold text-zinc-50">
            {title}
          </h2>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>

        {imageUrl ? (
          <img
            src={imageUrl}
            alt={place.length > 0 ? `Map of ${place}` : "Room map"}
            className="mt-6 w-full border border-[var(--border)] object-contain"
          />
        ) : (
          <p className="mt-6 text-sm text-zinc-400" role="status">
            {busy ? "The map is being drawn." : "This room has no map."}
          </p>
        )}

        {doors.length > 0 ? (
          <ul className="mt-6 border-t border-[var(--border)]">
            {doors.map((door) => (
              <li key={door.wall} className="flex items-baseline justify-between gap-3 border-b border-[var(--border)] py-3">
                <span className="text-sm font-medium text-zinc-300">{WALL_LABELS[door.wall]}</span>
                <span className="text-sm text-zinc-50">{door.name}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
