import { RenderHistoryList } from "@/components/history/render-history-list";

export const metadata = {
  title: "历史记录"
};

export default function HistoryPage() {
  return (
    <div className="space-y-8">
      <section className="rounded-[36px] border border-black/12 bg-white px-6 py-7 shadow-soft md:px-8 md:py-8 xl:px-10 xl:py-10">
        <div className="space-y-4">
          <span className="inline-flex items-center rounded-full border border-black/14 bg-[#fafaf6] px-4 py-2 text-xs uppercase tracking-[0.28em] text-slate-900">
            History
          </span>
          <h1 className="font-display text-5xl leading-none text-slate-950 md:text-6xl">
            历史记录
          </h1>
        </div>
      </section>

      <section className="ui-stage-shell p-4 md:p-5">
        <RenderHistoryList />
      </section>
    </div>
  );
}
