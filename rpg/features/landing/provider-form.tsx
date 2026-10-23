"use client";

import { useEffect, useRef, useState } from "react";

import {
  type AiProvider,
  AI_PROVIDERS,
  providerLabel,
} from "@/rpg/lib/host-ai";
import { type HostAiInput } from "@/rpg/features/landing/use-host-ai";

interface ProviderFormProps {
  ready: boolean;
  linked: boolean;
  provider: AiProvider | null;
  model: string;
  save: (input: HostAiInput) => string | null;
  remove: () => string | null;
}

export function ProviderForm({
  ready,
  linked,
  provider,
  model,
  save,
  remove,
}: ProviderFormProps) {
  const [selectedProvider, setSelectedProvider] = useState<AiProvider | "">("");
  const [modelName, setModelName] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const hydrated = useRef(false);

  useEffect(() => {
    if (!ready || hydrated.current) return;
    hydrated.current = true;
    if (provider) setSelectedProvider(provider);
    if (model) setModelName(model);
  }, [ready, provider, model]);

  return (
    <section aria-labelledby="provider-heading" className="panel p-6">
      <h2 id="provider-heading" className="text-xl font-semibold text-zinc-50">
        AI provider
      </h2>
      <p className="mt-1 text-sm text-zinc-400">
        Stored in this browser only. It is not written into the campaign save.
      </p>

      <form
        className="mt-6 space-y-4"
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          setError(null);

          if (selectedProvider !== "openai" && selectedProvider !== "anthropic") {
            setError("Choose OpenAI or Anthropic.");
            return;
          }

          const message = save({
            provider: selectedProvider,
            model: modelName,
            apiKey,
          });
          if (message) {
            setError(message);
            return;
          }

          setApiKey("");
        }}
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block text-sm text-zinc-300">
            Provider
            <select
              required
              value={selectedProvider}
              disabled={!ready}
              onChange={(event) => {
                const value = event.target.value;
                setSelectedProvider(
                  value === "openai" || value === "anthropic" ? value : "",
                );
                setError(null);
              }}
              className="field mt-1 w-full"
            >
              <option value="">Choose a provider</option>
              {AI_PROVIDERS.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm text-zinc-300">
            Model
            <input
              type="text"
              required
              autoComplete="off"
              spellCheck={false}
              disabled={!ready}
              placeholder={selectedProvider === "anthropic" ? "claude-sonnet-4-5" : "gpt-4o"}
              value={modelName}
              onChange={(event) => {
                setModelName(event.target.value);
                setError(null);
              }}
              className="field mt-1 w-full"
            />
          </label>

          <label className="block text-sm text-zinc-300">
            API key
            <input
              type="password"
              required={!linked}
              autoComplete="off"
              spellCheck={false}
              disabled={!ready}
              placeholder={linked ? "Blank keeps the saved key" : ""}
              value={apiKey}
              onChange={(event) => {
                setApiKey(event.target.value);
                setError(null);
              }}
              className="field mt-1 w-full"
            />
          </label>
        </div>

        {error ? (
          <p
            role="alert"
            className="rounded-lg border border-red-500/30 bg-red-950/40 px-3 py-2 text-sm text-red-200"
          >
            {error}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          <button type="submit" disabled={!ready} className="btn btn-primary">
            {linked ? "Update provider" : "Link provider"}
          </button>
          {linked ? (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                const message = remove();
                if (message) {
                  setError(message);
                  return;
                }
                setSelectedProvider("");
                setModelName("");
                setApiKey("");
                setError(null);
              }}
            >
              Remove
            </button>
          ) : null}
          {linked && provider ? (
            <p role="status" className="min-w-0 text-sm break-all text-zinc-300">
              Linked · {providerLabel(provider)} · {model}
            </p>
          ) : null}
        </div>
      </form>
    </section>
  );
}
