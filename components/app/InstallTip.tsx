"use client";

import { useEffect, useState } from "react";

type InstallPrompt = Event & { prompt: () => Promise<void> };

const KEY = "bayline_install_tip";

/**
 * A one-time "Add to Home Screen" tip on phones, inside the dashboard. Android Chrome gets an Install
 * button; iPhone gets the Share-menu steps. Never shown once installed or dismissed.
 */
export function InstallTip() {
  const [kind, setKind] = useState<"ios" | "android" | null>(null);
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);

  useEffect(() => {
    let seen = true;
    try {
      seen = localStorage.getItem(KEY) === "1";
    } catch {}
    const standalone = matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
    const phone = matchMedia("(max-width: 767px) and (pointer: coarse)").matches;
    if (seen || standalone || !phone) return;
    const ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
    // Shown after mount only: the server can't know the device.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (ios) setKind("ios");
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPrompt(e as InstallPrompt);
      setKind("android");
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (!kind) return null;
  const close = () => {
    try {
      localStorage.setItem(KEY, "1");
    } catch {}
    setKind(null);
  };

  return (
    <div role="status" className="mx-auto mb-4 flex max-w-6xl items-start gap-3 rounded-2xl border border-blue/40 bg-blue/10 p-3 text-sm print:hidden">
      <div className="min-w-0 flex-1">
        <p className="font-semibold">Add Bayline to your Home Screen</p>
        <p className="mt-0.5 text-muted">
          {kind === "ios" ? (
            <>
              Tap <strong className="text-fg">Share</strong> <span aria-hidden="true">(□↑)</span>, then <strong className="text-fg">Add to Home Screen</strong>. It opens straight to your venue.
            </>
          ) : (
            "It opens straight to your venue, like an app."
          )}
        </p>
        {kind === "android" && prompt && (
          <button
            type="button"
            onClick={async () => {
              await prompt.prompt();
              close();
            }}
            className="mt-2 rounded-full bg-blue px-4 py-2 font-semibold text-midnight"
          >
            Install
          </button>
        )}
      </div>
      <button type="button" onClick={close} aria-label="Dismiss" className="grid size-8 shrink-0 place-items-center rounded-full text-muted hover:bg-surface-2">
        ✕
      </button>
    </div>
  );
}
