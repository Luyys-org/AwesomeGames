import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/dashboard": ["*/manifest.json"],
  },
  redirects: async () => [
    { source: "/play", destination: "/game/leaders", permanent: true },
    { source: "/lobby", destination: "/game/leaders", permanent: true },
    { source: "/room/:code", destination: "/game/leaders/room/:code", permanent: true },
    {
      source: "/room/:code/game",
      destination: "/game/leaders/room/:code/game",
      permanent: true,
    },
  ],
};

export default nextConfig;
