export class IllegalGameMoveException extends Error {
  constructor(message: string) {
    super(message);
    this.name = "IllegalGameMoveException";
  }
}

export class StaleVersionException extends Error {
  readonly actualVersion: number;

  constructor(actualVersion: number, message = "Stale game version") {
    super(message);
    this.name = "StaleVersionException";
    this.actualVersion = actualVersion;
  }
}

export class ValidationException extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationException";
  }
}
