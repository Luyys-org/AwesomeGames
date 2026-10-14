"use client";

import { useEffect, useRef, useState } from "react";

import { formatRoomRole } from "@/leaders/lib/room-chat";
import type { RoomChatConnectionStatus } from "@/leaders/features/room/use-room-chat";
import type { ChatMessageView, RoomMembershipView } from "@/leaders/services/room.types";

interface RoomChatPanelProps {
  membership: RoomMembershipView;
  messages: ChatMessageView[];
  status: RoomChatConnectionStatus;
  error: string | null;
  sendMessage: (text: string) => void;
  className?: string;
}

function formatSentAt(iso: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));
  } catch {
    return "";
  }
}

export function RoomChatPanel({
  membership,
  messages,
  status,
  error,
  sendMessage,
  className,
}: RoomChatPanelProps) {
  const [draft, setDraft] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const visibleMessages = messages;

  useEffect(() => {
    const list = listRef.current;
    if (list) {
      list.scrollTop = list.scrollHeight;
    }
  }, [visibleMessages]);

  const chatLabel = membership.role === "SPECTATOR" ? "Chat" : "Player chat";
  const chatStatus =
    status === "connected"
      ? "Connected"
      : status === "connecting"
        ? "Connecting…"
        : status === "error"
          ? "Disconnected"
          : "Waiting…";

  return (
    <section
      aria-labelledby="room-chat-heading"
      className={`panel flex h-full min-h-[20rem] flex-col ${className ?? ""}`}
    >
      <div className="border-b border-zinc-800 px-4 py-3">
        <h2 id="room-chat-heading" className="text-sm font-semibold text-zinc-100">
          {chatLabel}
        </h2>
        <p className="mt-0.5 text-xs text-zinc-500">
          {membership.role === "SPECTATOR"
            ? "You can read player chat. Messages you send are visible to spectators only."
            : chatStatus}
        </p>
      </div>

      <div
        ref={listRef}
        className="flex-1 space-y-3 overflow-y-auto px-4 py-3"
        aria-live="polite"
        aria-relevant="additions"
      >
        {visibleMessages.length === 0 ? (
          <p className="text-sm text-zinc-500">No messages yet. Say hello.</p>
        ) : (
          visibleMessages.map((message) => (
            <article
              key={`${message.sentAt}-${message.senderPlayerId}-${message.text}`}
              className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2"
            >
              <header className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-xs text-zinc-400">
                <span className="font-medium text-zinc-200">{message.senderUsername}</span>
                <span>{formatRoomRole(message.senderRole)}</span>
                <time dateTime={message.sentAt}>{formatSentAt(message.sentAt)}</time>
              </header>
              <p className="mt-1 text-sm text-zinc-100">{message.text}</p>
            </article>
          ))
        )}
      </div>

      {error ? (
        <p role="alert" className="px-4 pb-2 text-xs text-red-300">
          {error}
        </p>
      ) : null}

      <form
        className="flex gap-2 border-t border-zinc-800 p-3"
        onSubmit={(event) => {
          event.preventDefault();
          sendMessage(draft);
          setDraft("");
        }}
      >
        <label className="sr-only" htmlFor="room-chat-input">
          Message
        </label>
        <input
          id="room-chat-input"
          type="text"
          maxLength={500}
          placeholder="Type a message…"
          value={draft}
          disabled={status !== "connected"}
          onChange={(event) => setDraft(event.target.value)}
          className="field min-w-0 flex-1 text-sm"
        />
        <button
          type="submit"
          disabled={status !== "connected" || draft.trim().length === 0}
          className="btn btn-primary"
        >
          Send
        </button>
      </form>
    </section>
  );
}
