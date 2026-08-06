"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deletePlan } from "./actions";

// A plain button (not its own <form>) so it can sit inside the enclosing
// bulk-save <form> without illegally nesting forms.
export default function ClearPlanButton({ id }: { id: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  return (
    <button
      type="button"
      disabled={busy}
      title="Clear this projection"
      onClick={async () => {
        setBusy(true);
        try {
          const formData = new FormData();
          formData.set("id", id);
          await deletePlan(formData);
          router.refresh();
        } finally {
          setBusy(false);
        }
      }}
      className="text-muted hover:text-[#b64b52] text-[11px] ml-1.5 disabled:opacity-50"
    >
      ×
    </button>
  );
}
