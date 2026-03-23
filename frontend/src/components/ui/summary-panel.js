export function SummaryPanel({ title, items }) {
  return (
    <div className="space-y-4">
      <p className="text-sm uppercase tracking-[0.24em] text-slate-500">{title}</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
        {items.map((item) => (
          <div
            key={item.label}
            className="rounded-2xl border border-black/10 bg-white px-4 py-4"
          >
            <p className="text-sm text-slate-500">{item.label}</p>
            <p className="mt-2 text-lg font-semibold text-slate-950">{item.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
