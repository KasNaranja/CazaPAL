"use client";

export type SortKey = "total" | "item";

export function SortDropdown({
  value,
  onChange,
}: {
  value: SortKey;
  onChange: (v: SortKey) => void;
}) {
  return (
    <label className="inline-flex items-center gap-2 text-sm text-stone-600">
      <span className="hidden sm:inline">Ordenar:</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as SortKey)}
        className="rounded-lg border border-stone-200 bg-white px-2.5 py-1.5 text-sm font-medium text-stone-800 shadow-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100"
      >
        <option value="total">Precio total ↑</option>
        <option value="item">Precio artículo ↑</option>
      </select>
    </label>
  );
}
