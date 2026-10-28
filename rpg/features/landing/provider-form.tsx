"use client";

import { useEffect, useState } from "react";

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
  imageModel: string;
  save: (input: HostAiInput) => string | null;
  remove: () => string | null;
}

export function ProviderForm({
  ready,
  linked,
  provider,
  model,
  imageModel,
  save,
  remove,
}: ProviderFormProps) {
  const [selectedProvider, setSelectedProvider] = useState<AiProvider | "">("");
  const [modelName, setModelName] = useState("");
  const [imageModelName, setImageModelName] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const { status, detail, check, reset } = useProviderHealth(linked);
  const [hydrated, setHydrated] = useState(false);
  const checking = status === "checking";
  const locked = status === "reachable" && !editing;
  const fieldsDisabled = !ready || checking || locked;

  if (ready && !hydrated) {
    setHydrated(true);
    if (provider) setSelectedProvider(provider);
    if (model) setModelName(model);
    if (imageModel) setImageModelName(imageModel);
  }

  useEffect(() => {
    if (!ready || !linked || editing) return;
    void check();
  }, [ready, linked, editing, check]);

  function beginEdit() {
    if (provider) setSelectedProvider(provider);
    if (model) setModelName(model);
    if (imageModel) setImageModelName(imageModel);
    setApiKey("");
    setError(null);
    setEditing(true);
    reset();
  }

  function clearProvider() {
    const message = remove();
    if (message) {
      setError(message);
      return;
    }
    reset();
    setEditing(false);
    setSelectedProvider("");
    setModelName("");
    setImageModelName("");
    setApiKey("");
    setError(null);
  }

  return (
    <section aria-labelledby="provider-heading" className="panel p-6">
      <h2 id="provider-heading" className="text-xl font-semibold text-zinc-50">
        AI provider
      </h2>
      <p className="mt-1 text-sm text-zinc-400">
        Stored in this browser only. It is not written into the campaign save. Scene images use OpenAI
        or Grok image models; Anthropic does not generate images.
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
            imageModel: imageModelName,
          });
          if (message) {
            setError(message);
            return;
          }

          setApiKey("");
          setEditing(false);
          void check();
        }}
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block text-sm text-zinc-300">
            Provider
            <select
              required
              value={selectedProvider}
              disabled={fieldsDisabled}
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
              disabled={fieldsDisabled}
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
              disabled={fieldsDisabled}
              placeholder={linked && !locked ? "Blank keeps the saved key" : ""}
              value={locked ? "••••••••" : apiKey}
              onChange={(event) => {
                setApiKey(event.target.value);
                setError(null);
              }}
              className="field mt-1 w-full"
            />
          </label>
        </div>

        <label className="block text-sm text-zinc-300">
          Image model
          <input
            type="text"
            autoComplete="off"
            spellCheck={false}
            disabled={fieldsDisabled || selectedProvider === "anthropic"}
            placeholder={
              AI_PROVIDERS.find((entry) => entry.id === selectedProvider)?.imageModelPlaceholder ??
              "Optional — provider default"
            }
            value={imageModelName}
            onChange={(event) => {
              setImageModelName(event.target.value);
              setError(null);
            }}
            className="field mt-1 w-full"
          />
          <span className="mt-1 block text-xs text-zinc-500">
            Used for campaign scene art during play. Leave blank to use the provider default.
          </span>
        </label>

        {error ? (
          <p
            role="alert"
            className="rounded-lg border border-red-500/30 bg-red-950/40 px-3 py-2 text-sm text-red-200"
          >
            {error}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-3">
          {locked ? (
            <>
              <button
                type="button"
                className="btn btn-secondary size-9 p-0"
                aria-label="Edit provider"
                title="Edit provider"
                onClick={beginEdit}
              >
                <PencilIcon />
              </button>
              <button
                type="button"
                className="btn btn-secondary size-9 p-0"
                aria-label="Delete provider"
                title="Delete provider"
                onClick={clearProvider}
              >
                <TrashIcon />
              </button>
            </>
          ) : (
            <>
              <button type="submit" disabled={!ready || checking} className="btn btn-primary">
                {linked ? "Update provider" : "Link provider"}
              </button>
              {linked ? (
                <button
                  type="button"
                  disabled={checking}
                  className="btn btn-secondary"
                  onClick={clearProvider}
                >
                  Remove
                </button>
              ) : null}
            </>
          )}
          {linked && provider && !locked ? (
            <p className="min-w-0 text-sm break-all text-zinc-300">
              Linked · {providerLabel(provider)} · {model}
            </p>
          ) : null}
          <ProviderHealth status={status} detail={detail} />
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

function PencilIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" className="h-4 w-4">
      <path
        d="M9.2 2.4 13.6 6.8 5.2 15.2H1v-4.2L9.2 2.4Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M7.6 4 12 8.4" fill="none" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" className="h-4 w-4">
      <path d="M3 4.5h10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M6.5 2.5h3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path
        d="M4.5 4.5 5.2 13h5.6l.7-8.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
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
