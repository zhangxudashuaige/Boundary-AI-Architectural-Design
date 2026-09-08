"use client";

import { ActionPanel } from "@/components/home/action-panel";
import { PromptInput } from "@/components/home/prompt-input";
import { RenderResult } from "@/components/home/render-result";
import { StyleList } from "@/components/home/style-list";
import { UploadPanel } from "@/components/home/upload-panel";
import { useHomeWorkspace } from "@/hooks/use-home-workspace";

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

  const historyRefreshKey =
    status === "success" || status === "error"
      ? `${taskId}:${status}:${resultUrl}`
      : "";

  return (
    <div className="min-h-screen bg-[#070707] text-white">
      <div className="mx-auto grid min-h-screen w-full max-w-[1920px] gap-3 p-3 lg:grid-cols-[300px_minmax(0,1fr)_210px] xl:gap-4 xl:p-4 2xl:grid-cols-[340px_minmax(0,1fr)_240px]">
        <aside className="flex min-h-[720px] flex-col rounded-[24px] border border-white/10 bg-[#111111] p-4 lg:min-h-[calc(100vh-2rem)] xl:p-5">
          <div className="space-y-5">
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
          </div>

          <ActionPanel
            status={status}
            canStart={canStart}
            isUploading={isUploading}
            isCreatingTask={isCreatingTask}
            onStartRender={handleStartRender}
          />
        </aside>

        <main className="min-w-0">
          <RenderResult
            status={status}
            resultUrl={resultUrl}
            renderError={renderError}
            pollError={pollError}
            downloadError={downloadError}
            isDownloading={isDownloading}
            onDownload={handleDownloadResult}
            canRegenerate={canStart}
            isCreatingTask={isCreatingTask}
            onRegenerate={handleStartRender}
            historyRefreshKey={historyRefreshKey}
          />
        </main>

        <StyleList />
      </div>
    </div>
  );
}
