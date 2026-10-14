export interface Rng {
  nextId(): string;
  nextBoolean(): boolean;
  /** Value in [0, 1). */
  nextFloat(): number;
}

export function defaultRng(): Rng {
  return {
    nextId: () => crypto.randomUUID(),
    nextBoolean: () => Math.random() < 0.5,
    nextFloat: () => Math.random(),
  };
}

export function shuffle<T>(items: readonly T[], rng: Rng): T[] {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(rng.nextFloat() * (index + 1));
    const current = copy[index];
    copy[index] = copy[swapIndex];
    copy[swapIndex] = current;
  }
  return copy;
}
