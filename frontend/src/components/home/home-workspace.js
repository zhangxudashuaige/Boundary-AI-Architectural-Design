"use client";

import { useState } from "react";
import { RenderHistoryList } from "@/components/history/render-history-list";
import { ActionPanel } from "@/components/home/action-panel";
import { PromptInput } from "@/components/home/prompt-input";
import { RenderResult } from "@/components/home/render-result";
import { UploadPanel } from "@/components/home/upload-panel";
import { useHomeWorkspace } from "@/hooks/use-home-workspace";

function HistoryToggle({ isOpen, onToggle }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-center justify-between gap-4 text-left"
    >
      <div>
        <p className="ui-section-kicker">History</p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-950 md:text-3xl">
          历史记录
        </h2>
      </div>

      <span className="inline-flex items-center rounded-full border border-black/12 bg-white px-4 py-2 text-sm text-slate-900">
        {isOpen ? "收起" : "展开"}
      </span>
    </button>
  );
}

export function HomeWorkspace() {
  const {
    promptValue,
    isPromptRefined,
    previewUrl,
    imageUrl,
    taskId,
    status,
    resultUrl,
    uploadError,
    promptError,
    promptRefineError,
    renderError,
    downloadError,
    pollError,
    isUploading,
    isRefiningPrompt,
    isCreatingTask,
    isDownloading,
    canStart,
    handlePromptChange,
    handleRefinePrompt,
    handleSelectImage,
    handleClearImage,
    handleStartRender,
    handleDownloadResult
  } = useHomeWorkspace();
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const historyRefreshKey =
    status === "success" || status === "error"
      ? `${taskId}:${status}:${resultUrl}`
      : "";

  return (
    <div className="space-y-8">
      <section className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)] 2xl:grid-cols-[380px_minmax(0,1fr)] xl:items-start">
        <aside className="space-y-5 xl:sticky xl:top-24">
          <div className="space-y-6">
            <UploadPanel
              previewUrl={previewUrl}
              imageUrl={imageUrl}
              uploadError={uploadError}
              isUploading={isUploading}
              onSelectImage={handleSelectImage}
              onClearImage={handleClearImage}
            />
            <PromptInput
              promptValue={promptValue}
              isPromptRefined={isPromptRefined}
              errorMessage={promptError}
              refineErrorMessage={promptRefineError}
              isRefining={isRefiningPrompt}
              onPromptChange={handlePromptChange}
              onRefine={handleRefinePrompt}
            />
            <ActionPanel
              status={status}
              canStart={canStart}
              isUploading={isUploading}
              isCreatingTask={isCreatingTask}
              onStartRender={handleStartRender}
            />
          </div>
        </aside>

        <div className="min-w-0 space-y-5">
          <RenderResult
            status={status}
            resultUrl={resultUrl}
            renderError={renderError}
            pollError={pollError}
            downloadError={downloadError}
            isDownloading={isDownloading}
            onDownload={handleDownloadResult}
          />
        </div>
      </section>

      <section className="ui-stage-shell p-4 md:p-5 lg:p-6">
        <HistoryToggle
          isOpen={isHistoryOpen}
          onToggle={() => setIsHistoryOpen((value) => !value)}
        />

        {isHistoryOpen ? (
          <div className="mt-6">
            <RenderHistoryList refreshKey={historyRefreshKey} />
          </div>
        ) : null}
      </section>
    </div>
  );
}
