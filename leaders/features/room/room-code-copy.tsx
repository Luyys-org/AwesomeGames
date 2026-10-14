"use client";

import { useCallback, useState } from "react";

interface RoomCodeCopyProps {
  code: string;
}

export function RoomCodeCopy({ code }: RoomCodeCopyProps) {
  const [copied, setCopied] = useState(false);

  const copyCode = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch {
      setCopied(false);
    }
  }, [code]);

  return (
    <div className="flex items-center gap-2">
      <span className="font-mono text-lg text-amber-300">{code}</span>
      <button
        type="button"
        onClick={() => {
          void copyCode();
        }}
        className="btn btn-secondary px-2 py-1 text-xs"
      >
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}
