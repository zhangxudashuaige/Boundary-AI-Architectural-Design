"use client";

import { useState } from "react";
import { PromptLibrary } from "@/components/home/prompt-library";

function getPromptStateText({ isRefining, refineErrorMessage, isPromptRefined }) {
  if (isRefining) {
    return "AI 正在优化描述";
  }

  if (refineErrorMessage) {
    return "AI 优化失败";
  }

  if (isPromptRefined) {
    return "当前内容已由 AI 优化";
  }

  return "描述建筑画面、材质、光照与氛围";
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
  const [isLibraryOpen, setIsLibraryOpen] = useState(false);
  const refineDisabled = isRefining || !promptValue.trim();

  function handleSelectPrompt(content) {
    onPromptChange(content);
  }

  return (
    <section>
      <label htmlFor="prompt-input" className="text-sm font-medium text-white/85">
        文字描述
      </label>

      <div className="relative mt-3 rounded-[18px] border border-white/10 bg-white/[0.025] focus-within:border-violet-400/55 focus-within:ring-2 focus-within:ring-violet-400/10">
        <textarea
          id="prompt-input"
          rows={8}
          value={promptValue}
          onChange={onPromptChange}
          className="min-h-[220px] w-full resize-none bg-transparent px-4 pb-24 pt-4 text-sm leading-7 text-white outline-none placeholder:text-white/30"
          placeholder="请输入对建筑画面、材质、光照、氛围等内容的描述..."
        />

        <div className="absolute inset-x-3 bottom-3">
          <p className="mb-2 truncate text-[11px] text-white/35">
            {getPromptStateText({
              isRefining,
              refineErrorMessage,
              isPromptRefined
            })}
          </p>

          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setIsLibraryOpen(true)}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.04] px-3 py-2 text-xs font-medium text-white/70 transition hover:border-white/25 hover:bg-white/[0.08] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
            >
              <span aria-hidden="true">▦</span>
              提示词库
            </button>

            <button
              type="button"
              onClick={onRefine}
              disabled={refineDisabled}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-violet-400/35 bg-violet-500/10 px-3 py-2 text-xs font-medium text-violet-200 transition hover:border-violet-300/60 hover:bg-violet-500/20 disabled:cursor-not-allowed disabled:border-white/10 disabled:bg-white/[0.03] disabled:text-white/25"
            >
              <span aria-hidden="true">✦</span>
              {isRefining ? "优化中" : "AI 优化"}
            </button>
          </div>
        </div>
      </div>

      {refineErrorMessage ? (
        <div className="mt-3 rounded-[14px] border border-red-400/25 bg-red-500/10 px-3 py-2 text-sm leading-6 text-red-200">
          {refineErrorMessage}
        </div>
      ) : null}

      {errorMessage ? (
        <div className="mt-3 rounded-[14px] border border-red-400/25 bg-red-500/10 px-3 py-2 text-sm leading-6 text-red-200">
          {errorMessage}
        </div>
      ) : null}

      <PromptLibrary
        isOpen={isLibraryOpen}
        onClose={() => setIsLibraryOpen(false)}
        onSelectPrompt={handleSelectPrompt}
      />
    </section>
  );
}
