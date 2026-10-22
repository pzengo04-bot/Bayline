"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

const WORDS = ["indoor golf", "cafés", "barbershops", "fitness studios", "your business"];
const STEP_MS = 1500;
const MOTION = "(prefers-reduced-motion: reduce)";

const prefersReducedMotion = () => window.matchMedia(MOTION).matches;
function subscribeMotion(onChange: () => void) {
  const mq = window.matchMedia(MOTION);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

/**
 * "Built for [indoor golf → cafés → … → your business]": plays once and stops on the last word.
 * Screen readers and reduced-motion visitors get one static sentence instead.
 */
export function RotatingLine() {
  const [i, setI] = useState(0);
  const reduced = useSyncExternalStore(subscribeMotion, prefersReducedMotion, () => false);

  useEffect(() => {
    if (reduced || i >= WORDS.length - 1) return;
    const t = setTimeout(() => setI(i + 1), STEP_MS);
    return () => clearTimeout(t);
  }, [i, reduced]);

  return (
    <p className="mt-4 text-xl font-semibold sm:text-2xl">
      <span className="sr-only">Built for local businesses like yours.</span>
      {reduced ? (
        <span aria-hidden="true">Built for local businesses like yours.</span>
      ) : (
        <span aria-hidden="true" className="inline-flex flex-wrap items-baseline gap-x-2">
          Built for
          <span className="relative inline-grid align-bottom">
            {/* Every word occupies the same cell; only the current one is visible. */}
            {WORDS.map((w, n) => (
              <span
                key={w}
                className={`col-start-1 row-start-1 justify-self-start whitespace-nowrap rounded bg-accent px-1.5 transition-all duration-500 ease-out ${
                  n === i ? "translate-y-0 opacity-100" : n < i ? "invisible -translate-y-3 opacity-0" : "invisible translate-y-3 opacity-0"
                }`}
              >
                {w}.
              </span>
            ))}
          </span>
        </span>
      )}
    </p>
  );
}
