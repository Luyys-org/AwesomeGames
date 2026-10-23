import { gameHomePath } from "@/common/game-path";

const home = gameHomePath("rpg");

export const paths = {
  home,
  newGame: `${home}/new`,
  room: (code: string) => `${home}/room/${encodeURIComponent(code)}`,
};
