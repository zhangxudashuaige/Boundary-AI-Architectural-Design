export function SummaryPanel({ title, items }) {
  return (
    <div className="space-y-4">
      <p className="text-sm uppercase tracking-[0.24em] text-emerald">{title}</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
        {items.map((item) => (
          <div
            key={item.label}
            className="rounded-2xl border border-white/[0.08] bg-black/10 px-4 py-4"
          >
            <p className="text-sm text-slate-400">{item.label}</p>
            <p className="mt-2 text-lg font-semibold text-white">{item.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
