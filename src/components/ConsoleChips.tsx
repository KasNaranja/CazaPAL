"use client";

import { CONSOLE_OPTIONS, type ConsoleKey } from "@/lib/types";

export function ConsoleChips({
  value,
  onChange,
}: {
  value: ConsoleKey;
  onChange: (key: ConsoleKey) => void;
}) {
  return (
    <div
      className="flex flex-wrap gap-2"
      role="radiogroup"
      aria-label="Consola"
    >
      {CONSOLE_OPTIONS.map((opt) => {
        const active = opt.key === value;
        return (
          <button
            key={opt.key}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt.key)}
            className={[
              "rounded-full px-3.5 py-2 text-sm font-medium transition min-h-[40px]",
              "border",
              active
                ? "bg-brand-600 text-white border-brand-600 shadow-sm"
                : "bg-white text-stone-700 border-stone-200 hover:border-brand-300 hover:text-brand-700",
            ].join(" ")}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
