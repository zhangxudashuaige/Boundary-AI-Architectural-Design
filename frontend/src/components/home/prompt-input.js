import { Panel } from "@/components/ui/panel";

function RefineButton({ isDisabled, isRefining, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isDisabled}
      className="inline-flex items-center justify-center rounded-[14px] border border-black/14 bg-white px-4 py-2 text-xs font-medium text-slate-900 transition hover:bg-[#f5f5f0] disabled:cursor-not-allowed disabled:border-black/8 disabled:bg-[#f7f7f4] disabled:text-slate-400"
    >
      {isRefining ? "AI优化中..." : "AI优化"}
    </button>
  );
}

function getPromptStateText({ isRefining, refineErrorMessage, isPromptRefined }) {
  if (isRefining) {
    return "AI优化中";
  }

  if (refineErrorMessage) {
    return "AI优化失败";
  }

  if (isPromptRefined) {
    return "当前内容为 AI 优化结果";
  }

  return "当前内容为原始输入";
}

export function PromptInput({
  promptValue,
  isPromptRefined,
  onPromptChange,
  onRefine,
  errorMessage = "",
  refineErrorMessage = "",
  isRefining = false
}) {
  return (
    <Panel className="space-y-0 overflow-hidden p-0">
      <div className="px-5 py-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-medium text-slate-950">文本描述</p>
          <RefineButton
            onClick={onRefine}
            isRefining={isRefining}
            isDisabled={isRefining || !promptValue.trim()}
          />
        </div>

        <p className="mt-2 text-xs text-slate-500">
          {getPromptStateText({
            isRefining,
            refineErrorMessage,
            isPromptRefined
          })}
        </p>

        <textarea
          id="prompt-input"
          rows={9}
          value={promptValue}
          onChange={onPromptChange}
          className="mt-4 min-h-[230px] w-full resize-none bg-transparent text-sm leading-7 text-slate-900 outline-none placeholder:text-slate-500"
          placeholder="请输入文本描述"
        />
      </div>

      {refineErrorMessage ? (
        <div className="border-t border-black/8 px-5 py-4">
          <div className="ui-alert border-black/12 bg-[#fafaf6] text-slate-900">
            {refineErrorMessage}
          </div>
        </div>
      ) : null}

      {errorMessage ? (
        <div className="border-t border-black/8 px-5 py-4">
          <div className="ui-alert border-black/12 bg-[#fafaf6] text-slate-900">
            {errorMessage}
          </div>
        </div>
      ) : null}
    </Panel>
  );
}
