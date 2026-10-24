"use client";

import { useEffect, useRef, useState } from "react";

import {
  type ProviderHealthStatus,
  useProviderHealth,
} from "@/rpg/features/landing/use-provider-health";
import { type HostAiInput } from "@/rpg/features/landing/use-host-ai";
import {
  type AiProvider,
  AI_PROVIDERS,
  isAiProvider,
  providerLabel,
} from "@/rpg/lib/host-ai";

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
  const health = useProviderHealth(linked);
  const hydrated = useRef(false);
  const checking = health.status === "checking";

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

          if (!isAiProvider(selectedProvider)) {
            setError("Choose OpenAI, Anthropic, or Grok.");
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
          void health.check();
        }}
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block text-sm text-zinc-300">
            Provider
            <select
              required
              value={selectedProvider}
              disabled={!ready || checking}
              onChange={(event) => {
                const value = event.target.value;
                setSelectedProvider(isAiProvider(value) ? value : "");
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
              disabled={!ready || checking}
              placeholder={
                AI_PROVIDERS.find((entry) => entry.id === selectedProvider)?.modelPlaceholder ??
                "gpt-4o"
              }
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
              disabled={!ready || checking}
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
          <button type="submit" disabled={!ready || checking} className="btn btn-primary">
            {linked ? "Update provider" : "Link provider"}
          </button>
          {linked ? (
            <button
              type="button"
              disabled={checking}
              className="btn btn-secondary"
              onClick={() => {
                const message = remove();
                if (message) {
                  setError(message);
                  return;
                }
                health.reset();
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
            <p className="min-w-0 text-sm break-all text-zinc-300">
              Linked · {providerLabel(provider)} · {model}
            </p>
          ) : null}
          <ProviderHealth status={health.status} detail={health.detail} />
        </div>
      </form>
    </section>
  );
}

function ProviderHealth({
  status,
  detail,
}: {
  status: ProviderHealthStatus;
  detail: string | null;
}) {
  if (status === "idle") return null;

  if (status === "checking") {
    return (
      <p role="status" className="text-sm text-zinc-400">
        Checking provider…
      </p>
    );
  }

  const ok = status === "reachable";
  const label = ok ? "Reachable" : `Unreachable. ${detail ?? "The provider could not be reached."}`;

  return (
    <p
      role="status"
      className={`inline-flex max-w-full min-w-0 items-start gap-2 text-sm ${ok ? "text-zinc-300" : "text-red-200"}`}
    >
      <HealthIcon ok={ok} />
      <span className="min-w-0 break-words">{label}</span>
    </p>
  );
}

function HealthIcon({ ok }: { ok: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 16 16"
      className={`mt-0.5 h-4 w-4 shrink-0 ${ok ? "text-emerald-400" : "text-red-400"}`}
    >
      <circle cx="8" cy="8" r="6.25" fill="none" stroke="currentColor" strokeWidth="1.5" />
      {ok ? (
        <path
          d="M5 8.2 7 10.1 11 5.9"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : (
        <path
          d="M5.6 5.6 10.4 10.4 M10.4 5.6 5.6 10.4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      )}
    </svg>
  );
}
