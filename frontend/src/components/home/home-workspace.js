"use client";

import { UploadPanel } from "@/components/home/upload-panel";
import { PromptInput } from "@/components/home/prompt-input";
import { ActionPanel } from "@/components/home/action-panel";
import { RenderResult } from "@/components/home/render-result";
import { useHomeWorkspace } from "@/hooks/use-home-workspace";

export function HomeWorkspace() {
  const {
    prompt,
    previewUrl,
    imageName,
    imageMeta,
    imageUrl,
    fileUrl,
    filePath,
    taskId,
    backendTaskStatus,
    status,
    resultUrl,
    uploadError,
    promptError,
    renderError,
    pollError,
    isUploading,
    isCreatingTask,
    isPolling,
    canStart,
    hasImage,
    handlePromptChange,
    handleSelectImage,
    handleClearImage,
    handleStartRender,
    handleDownloadPlaceholder
  } = useHomeWorkspace();

  return (
    <section className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
      <div className="space-y-6">
        <UploadPanel
          previewUrl={previewUrl}
          imageName={imageName}
          imageMeta={imageMeta}
          imageUrl={imageUrl}
          fileUrl={fileUrl}
          filePath={filePath}
          uploadError={uploadError}
          isUploading={isUploading}
          onSelectImage={handleSelectImage}
          onClearImage={handleClearImage}
        />
        <PromptInput
          value={prompt}
          onChange={handlePromptChange}
          errorMessage={promptError}
        />
        <ActionPanel
          status={status}
          canStart={canStart}
          isUploading={isUploading}
          isCreatingTask={isCreatingTask}
          isPolling={isPolling}
          taskId={taskId}
          backendTaskStatus={backendTaskStatus}
          renderError={renderError}
          pollError={pollError}
          onStartRender={handleStartRender}
        />
      </div>

      <RenderResult
        status={status}
        hasImage={hasImage}
        resultUrl={resultUrl}
        taskId={taskId}
        backendTaskStatus={backendTaskStatus}
        renderError={renderError}
        pollError={pollError}
        isPolling={isPolling}
        onRetry={handleStartRender}
        onDownload={handleDownloadPlaceholder}
      />
    </section>
  );
}
