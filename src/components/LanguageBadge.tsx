"use client";

import { useEffect, useRef, useState } from "react";
import { verdictMeta } from "@/lib/format";
import type { LanguageVerdict } from "@/lib/types";

export function LanguageBadge({
  verdict,
  evidence,
}: {
  verdict: LanguageVerdict;
  evidence: string | null;
}) {
  const meta = verdictMeta(verdict);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const pending = verdict === "pending";

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const defaultPending =
    "Analizando las fotos del anuncio para determinar el idioma…";

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          setOpen((o) => !o);
        }}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={[
          "inline-flex max-w-full items-center gap-1 rounded-full border px-1.5 py-0.5 text-[11px] font-semibold sm:gap-1.5 sm:px-2.5 sm:py-1 sm:text-xs",
          meta.className,
          pending ? "animate-pulseSoft" : "",
        ].join(" ")}
      >
        <span
          className={["h-1.5 w-1.5 shrink-0 rounded-full", meta.dotClassName].join(" ")}
          aria-hidden
        />
        <span className="truncate">{meta.label}</span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Evidencia del análisis"
          className="absolute z-30 mt-2 w-64 rounded-xl border border-stone-200 bg-white p-3 text-left shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="text-xs font-semibold text-stone-500">
            {pending ? "Análisis en curso" : "Evidencia de la IA"}
          </p>
          <p className="mt-1 text-sm leading-snug text-stone-800">
            {evidence || defaultPending}
          </p>
        </div>
      )}
    </div>
  );
}
