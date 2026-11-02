"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { renameCustomer } from "@/app/dashboard/scan/actions";
import { Modal } from "@/components/ui/Modal";

/** The Edit button on Customer information: fixes the name (the wallet card updates too). */
export function EditName({ id, name }: { id: string; name: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(name);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="h-8 rounded-[8px] border border-line px-3 text-sm font-semibold hover:border-blue/60">
        Edit
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Edit customer">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            start(async () => {
              const r = await renameCustomer(id, value);
              if (!r.ok) return setError(r.message);
              setOpen(false);
              router.refresh();
            });
          }}
        >
          <label className="block text-sm font-semibold">
            Name
            <input value={value} onChange={(e) => setValue(e.target.value)} maxLength={60} className="mt-1.5 h-11 w-full rounded-[10px] border border-line bg-surface-2 px-3 text-base" />
          </label>
          <p className="mt-2 text-xs text-muted">Phone and offer choices stay as the customer set them.</p>
          {error && <p className="mt-2 text-sm font-semibold text-orange">{error}</p>}
          <button type="submit" disabled={pending} className="mt-4 h-11 w-full rounded-[10px] bg-blue font-semibold text-midnight hover:bg-blue-hover">
            {pending ? "Saving…" : "Save"}
          </button>
        </form>
      </Modal>
    </>
  );
}
