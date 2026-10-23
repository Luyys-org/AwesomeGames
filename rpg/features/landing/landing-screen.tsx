"use client";

import { ProviderForm } from "@/rpg/features/landing/provider-form";
import { SessionPanels } from "@/rpg/features/landing/session-panels";
import { useHostAi } from "@/rpg/features/landing/use-host-ai";

export function LandingScreen() {
  const hostAi = useHostAi();

  return (
    <div className="mt-8 flex flex-col gap-6">
      <SessionPanels ready={hostAi.ready} linked={hostAi.linked} />
      <ProviderForm
        ready={hostAi.ready}
        linked={hostAi.linked}
        provider={hostAi.provider}
        model={hostAi.model}
        save={hostAi.save}
        remove={hostAi.remove}
      />
    </div>
  );
}
