"use client";

import jsQR from "jsqr";
import { useEffect, useRef, useState } from "react";

type Detector = { detect: (source: CanvasImageSource) => Promise<{ rawValue: string }[]> };
type DetectorCtor = new (opts: { formats: string[] }) => Detector;

/**
 * The back camera, reading QR codes until one is found. Uses the browser's BarcodeDetector where
 * there is one (Android Chrome) and jsQR on a canvas everywhere else (iPhone Safari).
 */
export function QrScanner({ onCode, onCancel }: { onCode: (code: string) => void; onCancel: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const done = useRef(false);
  const onCodeRef = useRef(onCode);
  useEffect(() => {
    onCodeRef.current = onCode;
  }, [onCode]);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let stopped = false;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    const Native = (globalThis as { BarcodeDetector?: DetectorCtor }).BarcodeDetector;
    const detector = Native ? new Native({ formats: ["qr_code"] }) : null;

    const found = (code: string) => {
      if (done.current) return;
      done.current = true;
      navigator.vibrate?.(40);
      onCodeRef.current(code);
    };

    async function read() {
      const v = video.current;
      if (stopped || !v || done.current) return;
      if (v.readyState >= 2 && v.videoWidth) {
        try {
          if (detector) {
            const codes = await detector.detect(v);
            if (codes[0]?.rawValue) return found(codes[0].rawValue);
          } else if (ctx) {
            // Decode a downscaled frame: plenty for a QR held up to the camera, and fast on phones.
            const scale = Math.min(1, 640 / v.videoWidth);
            canvas.width = Math.round(v.videoWidth * scale);
            canvas.height = Math.round(v.videoHeight * scale);
            ctx.drawImage(v, 0, 0, canvas.width, canvas.height);
            const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const qr = jsQR(img.data, img.width, img.height, { inversionAttempts: "dontInvert" });
            if (qr?.data) return found(qr.data);
          }
        } catch {
          // A frame that fails to decode is just skipped.
        }
      }
      timer = setTimeout(read, 120);
    }

    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError("This browser can't open the camera. Search by name instead.");
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
        if (stopped) return stream.getTracks().forEach((t) => t.stop());
        const v = video.current!;
        v.srcObject = stream;
        await v.play();
        read();
      } catch (e) {
        const name = (e as Error).name;
        setError(
          name === "NotAllowedError"
            ? "Camera access is blocked. Allow it for this site in your browser settings, or search by name."
            : "Couldn't open the camera. Search by name instead.",
        );
      }
    })();

    return () => {
      stopped = true;
      clearTimeout(timer);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  return (
    <div>
      <div className="relative aspect-square overflow-hidden rounded-3xl bg-midnight ring-1 ring-line">
        <video ref={video} playsInline muted autoPlay className="h-full w-full object-cover" />
        {!error && (
          <div aria-hidden="true" className="pointer-events-none absolute inset-[18%] rounded-3xl border-4 border-blue/90 shadow-[0_0_0_999px_rgb(2_7_10/0.45)]" />
        )}
        {error && <p className="absolute inset-0 grid place-items-center p-6 text-center text-fg">{error}</p>}
      </div>
      <p className="mt-3 text-center text-sm text-muted">{error ? "" : "Hold the QR code on the customer's card inside the frame."}</p>
      <button type="button" onClick={onCancel} className="mt-3 h-14 w-full rounded-full border border-line bg-surface-2 text-base font-semibold">
        Cancel
      </button>
    </div>
  );
}
