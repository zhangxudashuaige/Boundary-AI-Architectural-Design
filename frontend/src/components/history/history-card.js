import { Panel } from "@/components/ui/panel";

export function HistoryCard({ title, status, time, summary }) {
  return (
    <Panel className="grid gap-5 lg:grid-cols-[220px_1fr]">
      <div className="rounded-[24px] border border-dashed border-white/[0.12] bg-slate-950/[0.45] p-4">
        <div className="flex h-full min-h-[180px] items-center justify-center rounded-[18px] border border-white/[0.08] bg-black/10 text-center">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Thumbnail</p>
            <p className="mt-3 text-sm text-slate-400">结果缩略图占位</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col justify-between gap-5">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-2xl font-semibold text-white">{title}</h2>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
              {status}
            </span>
          </div>
          <p className="text-sm text-slate-400">提交时间：{time}</p>
          <p className="max-w-3xl leading-7 text-slate-300">{summary}</p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className="rounded-full border border-white/[0.12] bg-white/5 px-4 py-2 text-sm text-slate-100 transition hover:bg-white/10"
          >
            查看详情
          </button>
          <button
            type="button"
            className="rounded-full border border-white/[0.12] bg-transparent px-4 py-2 text-sm text-slate-100 transition hover:bg-white/10"
          >
            再次渲染
          </button>
        </div>
      </div>
    </Panel>
  );
}
