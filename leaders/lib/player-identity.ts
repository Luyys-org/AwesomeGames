const USERNAME_KEY = "dirigeant.username";

export function getRememberedUsername(): string {
  if (typeof window === "undefined") {
    return "";
  }
  return window.localStorage.getItem(USERNAME_KEY) ?? "";
}

export function rememberUsername(username: string): void {
  window.localStorage.setItem(USERNAME_KEY, username);
}
