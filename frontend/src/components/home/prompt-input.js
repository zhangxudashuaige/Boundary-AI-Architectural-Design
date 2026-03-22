import { Panel } from "@/components/ui/panel";

const promptTags = ["现代极简", "商业综合体", "夜景灯光", "高端住宅", "写实材质"];

export function PromptInput({ value, onChange, errorMessage = "" }) {
  return (
    <Panel className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-accent">Prompt Input</p>
          <h2 className="mt-3 text-2xl font-semibold text-white">描述渲染需求</h2>
        </div>
        <span className="ui-chip">Step 02</span>
      </div>

      <div className="space-y-3">
        <label className="ui-label block" htmlFor="render-prompt">
          场景描述
        </label>
        <textarea
          id="render-prompt"
          rows={7}
          value={value}
          onChange={onChange}
          className="ui-textarea min-h-[196px] resize-none"
          placeholder="例如：生成一张现代建筑外立面效果图，清晨柔光，石材与玻璃材质对比明确，氛围克制、专业，适合方案汇报。"
        />
        {errorMessage ? (
          <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
            {errorMessage}
          </div>
        ) : null}
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm font-medium text-slate-300">风格快捷标签</p>
          <span className="ui-chip">{value.length} 字</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {promptTags.map((tag) => (
            <button
              key={tag}
              type="button"
              className="ui-button-ghost py-2 text-sm"
            >
              {tag}
            </button>
          ))}
        </div>
      </div>
    </Panel>
  );
}
