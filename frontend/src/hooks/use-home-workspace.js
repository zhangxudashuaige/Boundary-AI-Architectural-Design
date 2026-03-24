"use client";

import { useEffect, useRef, useState } from "react";
import {
  BACKEND_RENDER_TASK_STATUS,
  isTerminalRenderTaskStatus
} from "@/config/render-task";
import { formatFileMeta, validateImageFile } from "@/config/upload";
import {
  buildRenderTaskRequest,
  createRenderTask
} from "@/lib/create-render-task";
import {
  clearHomeWorkspaceSnapshot,
  readHomeWorkspaceSnapshot,
  writeHomeWorkspaceSnapshot
} from "@/lib/home-workspace-storage";
import { downloadRenderResult } from "@/lib/download-render-result";
import { refinePrompt } from "@/lib/refine-prompt";
import { uploadImage } from "@/lib/upload-image";
import { useRenderTaskPolling } from "@/hooks/use-render-task-polling";

const META_UPLOADING = "\u4e0a\u4f20\u4e2d";
const META_UPLOADED = "\u5df2\u4e0a\u4f20";
const META_UPLOAD_FAILED = "\u4e0a\u4f20\u5931\u8d25";

const ERROR_PROMPT_REQUIRED =
  "\u8bf7\u8f93\u5165\u539f\u59cb\u63cf\u8ff0\uff0c\u6216\u586b\u5199 AI \u4f18\u5316\u540e\u63cf\u8ff0\u3002";
const ERROR_PROMPT_BEFORE_RENDER =
  "\u8bf7\u8865\u5145\u539f\u59cb\u63cf\u8ff0\u6216 AI \u4f18\u5316\u540e\u63cf\u8ff0\uff0c\u518d\u5f00\u59cb\u6e32\u67d3\u3002";
const ERROR_UPLOAD_RETRY =
  "\u56fe\u7247\u4e0a\u4f20\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5\u3002";
const ERROR_CREATE_TASK_RETRY =
  "\u521b\u5efa\u6e32\u67d3\u4efb\u52a1\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5\u3002";
const ERROR_REFINE_PROMPT_REQUIRED =
  "\u8bf7\u5148\u586b\u5199\u539f\u59cb\u63cf\u8ff0\uff0c\u518d\u8fdb\u884c AI \u4f18\u5316\u3002";
const ERROR_REFINE_PROMPT_RETRY =
  "AI \u4f18\u5316\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5\u3002";
const ERROR_TASK_FAILED =
  "\u6e32\u67d3\u4efb\u52a1\u6267\u884c\u5931\u8d25\u3002";
const ERROR_TASK_NOT_FOUND =
  "\u6e32\u67d3\u4efb\u52a1\u4e0d\u5b58\u5728\uff0c\u65e0\u6cd5\u7ee7\u7eed\u67e5\u8be2\u72b6\u6001\u3002";
const ERROR_DOWNLOAD_RETRY =
  "\u4e0b\u8f7d\u6e32\u67d3\u7ed3\u679c\u5931\u8d25\uff0c\u8bf7\u7a0d\u540e\u91cd\u8bd5\u3002";

function revokePreviewUrl(url) {
  if (url && url.startsWith("blob:")) {
    URL.revokeObjectURL(url);
  }
}

function hasPromptInput(value) {
  return typeof value === "string" && value.trim() !== "";
}

function hasSourceImage(value) {
  return typeof value === "string" && value.trim() !== "";
}

function hasWorkspaceInput({
  imageUrl = "",
  fileUrl = "",
  previewUrl = "",
  rawPrompt = "",
  refinedPrompt = "",
  prompt = ""
} = {}) {
  return (
    hasSourceImage(imageUrl) ||
    hasSourceImage(fileUrl) ||
    hasSourceImage(previewUrl) ||
    hasPromptInput(rawPrompt) ||
    hasPromptInput(refinedPrompt) ||
    hasPromptInput(prompt)
  );
}

function normalizeRestoredStatus(snapshot) {
  if (snapshot.status === "generating" && snapshot.taskId) {
    return "generating";
  }

  if (snapshot.status === "success") {
    return "success";
  }

  if (snapshot.status === "error") {
    return "error";
  }

  return hasWorkspaceInput(snapshot) ? "ready" : "idle";
}

function resolveResultPreviewUrl(taskResultImageUrl, fallbackImageUrl) {
  if (!taskResultImageUrl) {
    return fallbackImageUrl || "";
  }

  if (taskResultImageUrl.includes("mock-render.local")) {
    return fallbackImageUrl || taskResultImageUrl;
  }

  return taskResultImageUrl;
}

function buildImageMeta(meta, suffix) {
  return `${meta} / ${suffix}`;
}

export function useHomeWorkspace() {
  const [rawPrompt, setRawPrompt] = useState("");
  const [refinedPrompt, setRefinedPrompt] = useState("");
  const [promptInputMode, setPromptInputMode] = useState("raw");
  const [submittedRawPrompt, setSubmittedRawPrompt] = useState("");
  const [submittedRefinedPrompt, setSubmittedRefinedPrompt] = useState("");
  const [submittedRenderPrompt, setSubmittedRenderPrompt] = useState("");
  const [submittedRenderPromptSource, setSubmittedRenderPromptSource] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [imageName, setImageName] = useState("");
  const [imageMeta, setImageMeta] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [filePath, setFilePath] = useState("");
  const [taskId, setTaskId] = useState("");
  const [backendTaskStatus, setBackendTaskStatus] = useState("");
  const [status, setStatus] = useState("idle");
  const [resultUrl, setResultUrl] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [promptError, setPromptError] = useState("");
  const [promptRefineError, setPromptRefineError] = useState("");
  const [renderError, setRenderError] = useState("");
  const [downloadError, setDownloadError] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isRefiningPrompt, setIsRefiningPrompt] = useState(false);
  const [isCreatingTask, setIsCreatingTask] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  const uploadAbortRef = useRef(null);
  const refineAbortRef = useRef(null);
  const createTaskAbortRef = useRef(null);
  const previewUrlRef = useRef("");
  const hasRestoredRef = useRef(false);
  const promptValue = promptInputMode === "refined" ? refinedPrompt : rawPrompt;
  const renderTaskRequest = buildRenderTaskRequest({
    imageUrl,
    rawPrompt,
    refinedPrompt: promptInputMode === "refined" ? refinedPrompt : ""
  });

  useEffect(() => {
    previewUrlRef.current = previewUrl;
  }, [previewUrl]);

  useEffect(() => {
    const snapshot = readHomeWorkspaceSnapshot();

    if (snapshot) {
      const nextPreviewUrl = snapshot.imageUrl || snapshot.fileUrl || "";

      setRawPrompt(snapshot.rawPrompt || snapshot.prompt || "");
      setRefinedPrompt(snapshot.refinedPrompt || "");
      setPromptInputMode(
        snapshot.promptInputMode || (snapshot.refinedPrompt ? "refined" : "raw")
      );
      setSubmittedRawPrompt(snapshot.rawPrompt || snapshot.prompt || "");
      setSubmittedRefinedPrompt(snapshot.refinedPrompt || "");
      setSubmittedRenderPrompt(
        buildRenderTaskRequest({
          rawPrompt: snapshot.rawPrompt || snapshot.prompt || "",
          refinedPrompt: snapshot.refinedPrompt || ""
        }).prompt
      );
      setSubmittedRenderPromptSource(
        buildRenderTaskRequest({
          rawPrompt: snapshot.rawPrompt || snapshot.prompt || "",
          refinedPrompt: snapshot.refinedPrompt || ""
        }).promptSource
      );
      setPreviewUrl(nextPreviewUrl);
      setImageName(snapshot.imageName || "");
      setImageMeta(snapshot.imageMeta || "");
      setImageUrl(snapshot.imageUrl || "");
      setFileUrl(snapshot.fileUrl || "");
      setFilePath(snapshot.filePath || "");
      setTaskId(snapshot.taskId || "");
      setBackendTaskStatus(snapshot.backendTaskStatus || "");
      setStatus(normalizeRestoredStatus(snapshot));
      setResultUrl(snapshot.resultUrl || "");
      setRenderError(snapshot.renderError || "");
    }

    hasRestoredRef.current = true;

    return () => {
      cancelPendingUpload(false);
      cancelPendingPromptRefine(false);
      cancelPendingTaskCreation(false);
      revokePreviewUrl(previewUrlRef.current);
    };
  }, []);

  useEffect(() => {
    if (!hasRestoredRef.current) {
      return;
    }

    if (
      !imageUrl &&
      !previewUrl &&
      !taskId &&
      !rawPrompt.trim() &&
      !refinedPrompt.trim()
    ) {
      clearHomeWorkspaceSnapshot();
      return;
    }

    writeHomeWorkspaceSnapshot({
      prompt: rawPrompt,
      rawPrompt,
      refinedPrompt,
      promptInputMode,
      imageName,
      imageMeta,
      imageUrl,
      fileUrl,
      filePath,
      taskId,
      backendTaskStatus,
      status,
      resultUrl,
      renderError
    });
  }, [
    backendTaskStatus,
    filePath,
    fileUrl,
    imageMeta,
    imageName,
    imageUrl,
    previewUrl,
    promptInputMode,
    rawPrompt,
    refinedPrompt,
    renderError,
    resultUrl,
    status,
    taskId
  ]);

  function cancelPendingUpload(syncState = true) {
    if (uploadAbortRef.current) {
      uploadAbortRef.current.abort();
      uploadAbortRef.current = null;
    }

    if (syncState) {
      setIsUploading(false);
    }
  }

  function cancelPendingTaskCreation(syncState = true) {
    if (createTaskAbortRef.current) {
      createTaskAbortRef.current.abort();
      createTaskAbortRef.current = null;
    }

    if (syncState) {
      setIsCreatingTask(false);
    }
  }

  function cancelPendingPromptRefine(syncState = true) {
    if (refineAbortRef.current) {
      refineAbortRef.current.abort();
      refineAbortRef.current = null;
    }

    if (syncState) {
      setIsRefiningPrompt(false);
    }
  }

  function resetRenderTaskState(nextStatus = "idle") {
    cancelPendingTaskCreation();
    setTaskId("");
    setBackendTaskStatus("");
    setResultUrl("");
    setRenderError("");
    setDownloadError("");
    setSubmittedRawPrompt("");
    setSubmittedRefinedPrompt("");
    setSubmittedRenderPrompt("");
    setSubmittedRenderPromptSource(null);
    setStatus(nextStatus);
  }

  function clearPromptErrorIfNeeded(nextPrompt) {
    if (typeof nextPrompt === "string" && nextPrompt.trim()) {
      setPromptError("");
    }
  }

  function handlePromptChange(event) {
    const nextPrompt = event.target.value;
    let nextRawPrompt = rawPrompt;
    let nextRefinedPrompt = refinedPrompt;

    cancelPendingPromptRefine();
    setPromptRefineError("");
    if (promptInputMode === "refined") {
      if (nextPrompt === "") {
        nextRawPrompt = "";
        nextRefinedPrompt = "";
        setRawPrompt("");
        setRefinedPrompt("");
        setPromptInputMode("raw");
      } else {
        nextRefinedPrompt = nextPrompt;
        setRefinedPrompt(nextPrompt);
      }
    } else {
      nextRawPrompt = nextPrompt;
      setRawPrompt(nextPrompt);
    }

    if (!taskId && status !== "generating") {
      const nextRequest = buildRenderTaskRequest({
        imageUrl,
        rawPrompt: nextRawPrompt,
        refinedPrompt: promptInputMode === "refined" ? nextRefinedPrompt : ""
      });

      setStatus(
        hasWorkspaceInput({
          imageUrl,
          fileUrl,
          previewUrl,
          rawPrompt: nextRawPrompt,
          refinedPrompt: nextRefinedPrompt,
          prompt: nextRequest.prompt
        })
          ? "ready"
          : "idle"
      );
    }

    clearPromptErrorIfNeeded(nextPrompt);
  }

  async function handleRefinePrompt() {
    const sourcePrompt = promptValue.trim();

    if (!sourcePrompt) {
      setPromptRefineError(ERROR_REFINE_PROMPT_REQUIRED);
      return;
    }

    cancelPendingPromptRefine();
    setPromptRefineError("");

    const controller = new AbortController();
    refineAbortRef.current = controller;
    setIsRefiningPrompt(true);

    try {
      const result = await refinePrompt(
        {
          rawPrompt: sourcePrompt
        },
        controller.signal
      );

      if (refineAbortRef.current !== controller) {
        return;
      }

      if (!rawPrompt.trim()) {
        setRawPrompt(sourcePrompt);
      }
      setRefinedPrompt(result.refinedPrompt);
      setPromptInputMode("refined");
      setPromptRefineError("");
      setPromptError("");

      if (!taskId && status !== "generating") {
        setStatus(
          hasWorkspaceInput({
            imageUrl,
            fileUrl,
            previewUrl,
            rawPrompt: rawPrompt || sourcePrompt,
            refinedPrompt: result.refinedPrompt,
            prompt: result.refinedPrompt
          })
            ? "ready"
            : "idle"
        );
      }
    } catch (error) {
      if (error?.name === "AbortError") {
        return;
      }

      if (refineAbortRef.current !== controller) {
        return;
      }

      setPromptRefineError(error.message || ERROR_REFINE_PROMPT_RETRY);
    } finally {
      if (refineAbortRef.current === controller) {
        refineAbortRef.current = null;
        setIsRefiningPrompt(false);
      }
    }
  }

  async function handleSelectImage(event) {
    const fileInput = event.target;
    const file = fileInput.files?.[0];

    fileInput.value = "";

    if (!file) {
      return;
    }

    const validation = validateImageFile(file);

    if (!validation.valid) {
      setUploadError(validation.message);
      return;
    }

    cancelPendingUpload();
    resetRenderTaskState("idle");

    const nextPreviewUrl = URL.createObjectURL(file);
    const nextImageMeta = formatFileMeta(file);

    setUploadError("");
    setPromptError("");
    setRenderError("");
    setDownloadError("");
    setImageName(file.name);
    setImageMeta(buildImageMeta(nextImageMeta, META_UPLOADING));
    setImageUrl("");
    setFileUrl("");
    setFilePath("");
    setPreviewUrl((previousUrl) => {
      revokePreviewUrl(previousUrl);
      return nextPreviewUrl;
    });
    setIsUploading(true);

    const controller = new AbortController();
    uploadAbortRef.current = controller;

    try {
      const uploadedImage = await uploadImage(file, controller.signal);

      if (uploadAbortRef.current !== controller) {
        return;
      }

      setImageUrl(uploadedImage.imageUrl);
      setFileUrl(uploadedImage.fileUrl);
      setFilePath(uploadedImage.filePath);
      setImageName(uploadedImage.fileName || file.name);
      setImageMeta(buildImageMeta(nextImageMeta, META_UPLOADED));
      setStatus("ready");
      setUploadError("");
    } catch (error) {
      if (error?.name === "AbortError") {
        return;
      }

      if (uploadAbortRef.current !== controller) {
        return;
      }

      setUploadError(error.message || ERROR_UPLOAD_RETRY);
      setImageMeta(buildImageMeta(nextImageMeta, META_UPLOAD_FAILED));
      setStatus("idle");
    } finally {
      if (uploadAbortRef.current === controller) {
        uploadAbortRef.current = null;
        setIsUploading(false);
      }
    }
  }

  function handleClearImage() {
    cancelPendingUpload();
    cancelPendingPromptRefine();
    resetRenderTaskState("idle");

    setPreviewUrl((previousUrl) => {
      revokePreviewUrl(previousUrl);
      return "";
    });
    setRawPrompt("");
    setRefinedPrompt("");
    setPromptInputMode("raw");
    setImageName("");
    setImageMeta("");
    setImageUrl("");
    setFileUrl("");
    setFilePath("");
    setUploadError("");
    setPromptError("");
    setPromptRefineError("");
    setResultUrl("");
    setDownloadError("");
  }

  async function handleStartRender() {
    if (isUploading || isCreatingTask || status === "generating") {
      return;
    }

    let nextRenderError = "";
    let nextPromptError = "";
    const hasPendingImageUpload = Boolean(previewUrl && !imageUrl);

    if (hasPendingImageUpload) {
      nextRenderError = uploadError || ERROR_UPLOAD_RETRY;
    }

    if (!renderTaskRequest.prompt) {
      nextPromptError = ERROR_PROMPT_REQUIRED;
      nextRenderError = nextRenderError || ERROR_PROMPT_BEFORE_RENDER;
    }

    setPromptError(nextPromptError);
    setRenderError(nextRenderError);
    setDownloadError("");

    if (nextRenderError || nextPromptError) {
      return;
    }

    setIsCreatingTask(true);
    setTaskId("");
    setBackendTaskStatus("");
    setRenderError("");
    setResultUrl("");

    const controller = new AbortController();
    createTaskAbortRef.current = controller;

    try {
      const task = await createRenderTask(
        renderTaskRequest,
        controller.signal
      );

      if (createTaskAbortRef.current !== controller) {
        return;
      }

      setSubmittedRawPrompt(renderTaskRequest.rawPrompt);
      setSubmittedRefinedPrompt(renderTaskRequest.refinedPrompt);
      setSubmittedRenderPrompt(renderTaskRequest.prompt);
      setSubmittedRenderPromptSource(renderTaskRequest.promptSource);
      setTaskId(String(task.id));
      setBackendTaskStatus(task.status || BACKEND_RENDER_TASK_STATUS.PENDING);
      setStatus("generating");
      setRenderError("");
      setDownloadError("");
    } catch (error) {
      if (error?.name === "AbortError") {
        return;
      }

      if (createTaskAbortRef.current !== controller) {
        return;
      }

      setTaskId("");
      setBackendTaskStatus("");
      setStatus(
        hasWorkspaceInput({
          imageUrl,
          fileUrl,
          previewUrl,
          rawPrompt,
          refinedPrompt,
          prompt: renderTaskRequest.prompt
        })
          ? "ready"
          : "idle"
      );
      setRenderError(error.message || ERROR_CREATE_TASK_RETRY);
    } finally {
      if (createTaskAbortRef.current === controller) {
        createTaskAbortRef.current = null;
        setIsCreatingTask(false);
      }
    }
  }

  const { isPolling, pollError } = useRenderTaskPolling({
    taskId,
    enabled: status === "generating" && Boolean(taskId),
    onTaskUpdate: (task) => {
      setBackendTaskStatus(task.status || "");

      if (!isTerminalRenderTaskStatus(task.status)) {
        setStatus("generating");
      }
    },
    onTaskCompleted: (task) => {
      setBackendTaskStatus(task.status || BACKEND_RENDER_TASK_STATUS.COMPLETED);
      setStatus("success");
      setRenderError("");
      setDownloadError("");
      setResultUrl(
        resolveResultPreviewUrl(task.resultImageUrl, imageUrl || fileUrl || previewUrlRef.current)
      );
    },
    onTaskFailed: (task) => {
      setBackendTaskStatus(task.status || BACKEND_RENDER_TASK_STATUS.FAILED);
      setStatus("error");
      setResultUrl("");
      setRenderError(task.errorMessage || ERROR_TASK_FAILED);
    },
    onPollError: (error) => {
      if (error.status === 400 || error.status === 404) {
        setStatus("error");
        setRenderError(error.message || ERROR_TASK_NOT_FOUND);
      }
    }
  });

  async function handleDownloadResult() {
    if (status !== "success" || !taskId || isDownloading) {
      return;
    }

    setDownloadError("");
    setIsDownloading(true);

    try {
      await downloadRenderResult(taskId);
    } catch (error) {
      setDownloadError(error.message || ERROR_DOWNLOAD_RETRY);
    } finally {
      setIsDownloading(false);
    }
  }

  return {
    rawPrompt,
    refinedPrompt,
    activeRenderPrompt:
      taskId && submittedRenderPrompt ? submittedRenderPrompt : renderTaskRequest.prompt,
    activeRenderPromptSource:
      taskId && submittedRenderPromptSource
        ? submittedRenderPromptSource
        : renderTaskRequest.promptSource,
    activeRenderRawPrompt:
      taskId && submittedRenderPrompt ? submittedRawPrompt : renderTaskRequest.rawPrompt,
    activeRenderRefinedPrompt:
      taskId && submittedRenderPrompt ? submittedRefinedPrompt : renderTaskRequest.refinedPrompt,
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
    promptRefineError,
    renderError,
    downloadError,
    pollError,
    isUploading,
    isRefiningPrompt,
    isCreatingTask,
    isDownloading,
    isPolling,
    promptValue,
    isPromptRefined: promptInputMode === "refined" && Boolean(refinedPrompt.trim()),
    canStart:
      !isUploading &&
      !isCreatingTask &&
      status !== "generating" &&
      Boolean(renderTaskRequest.prompt),
    hasImage: Boolean(imageUrl || previewUrl),
    handlePromptChange,
    handleRefinePrompt,
    handleSelectImage,
    handleClearImage,
    handleStartRender,
    handleDownloadResult
  };
}
