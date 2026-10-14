import { gameHomePath } from "@/common/game-path";

const home = gameHomePath("leaders");

export const leadersPaths = {
  home,
  room: (code: string) => `${home}/room/${code}`,
  match: (code: string) => `${home}/room/${code}/game`,
};
