"use client";

import { useState } from "react";

export function CopyLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <code className="flex h-11 min-w-0 flex-1 items-center overflow-x-auto rounded-xl border border-line bg-surface-2 px-3 font-mono text-sm">
        {url}
      </code>
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          } catch {}
        }}
        className="h-11 shrink-0 rounded-full bg-blue px-5 text-sm font-semibold text-midnight"
      >
        {copied ? "Copied!" : "Copy link"}
      </button>
    </div>
  );
}
