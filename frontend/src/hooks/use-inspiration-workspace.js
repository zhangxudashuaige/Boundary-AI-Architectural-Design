"use client";

import { useEffect, useRef, useState } from "react";
import {
  BACKEND_INSPIRATION_TASK_STATUS,
  isTerminalInspirationTaskStatus
} from "@/config/inspiration-task";
import { formatFileMeta, validateImageFile } from "@/config/upload";
import {
  buildInspirationTaskRequest,
  createInspirationTask
} from "@/lib/create-inspiration-task";
import {
  clearInspirationWorkspaceSnapshot,
  readInspirationWorkspaceSnapshot,
  writeInspirationWorkspaceSnapshot
} from "@/lib/inspiration-workspace-storage";
import { downloadInspirationResult } from "@/lib/download-inspiration-result";
import { refinePrompt } from "@/lib/refine-prompt";
import { uploadImage } from "@/lib/upload-image";
import { useInspirationTaskPolling } from "@/hooks/use-inspiration-task-polling";

const MOCK_IMAGE_EDIT_HOST = "mock-image-edit.local";

const META_UPLOADING = "上传中";
const META_UPLOADED = "已上传";
const META_UPLOAD_FAILED = "上传失败";

const ERROR_UPLOAD_FIRST =
  "请先上传图片，上传成功后再开始生成灵感结果。";
const ERROR_PROMPT_REQUIRED =
  "请输入原始描述，或填写 AI 优化后的描述。";
const ERROR_PROMPT_BEFORE_GENERATION =
  "请补充原始描述或 AI 优化后的描述，再开始生成。";
const ERROR_UPLOAD_RETRY = "图片上传失败，请稍后重试。";
const ERROR_CREATE_TASK_RETRY = "创建灵感任务失败，请稍后重试。";
const ERROR_REFINE_PROMPT_REQUIRED =
  "请先填写原始描述，再进行 AI 优化。";
const ERROR_REFINE_PROMPT_RETRY = "AI 优化失败，请稍后重试。";
const ERROR_TASK_FAILED = "灵感任务执行失败。";
const ERROR_TASK_NOT_FOUND =
  "灵感任务不存在，无法继续查询状态。";
const ERROR_DOWNLOAD_RETRY = "下载灵感结果失败，请稍后重试。";

function revokePreviewUrl(url) {
  if (url && url.startsWith("blob:")) {
    URL.revokeObjectURL(url);
  }
}

function normalizeRestoredStatus(snapshot) {
  if (!snapshot?.imageUrl) {
    return "idle";
  }

  if (snapshot.status === "generating" && snapshot.taskId) {
    return "generating";
  }

  if (snapshot.status === "success") {
    return "success";
  }

  if (snapshot.status === "error") {
    return "error";
  }

  return "ready";
}

function resolveResultPreviewUrl(taskResultImageUrl, fallbackImageUrl) {
  if (!taskResultImageUrl) {
    return fallbackImageUrl || "";
  }

  if (taskResultImageUrl.includes(MOCK_IMAGE_EDIT_HOST)) {
    return fallbackImageUrl || taskResultImageUrl;
  }

  return taskResultImageUrl;
}

function buildImageMeta(meta, suffix) {
  return `${meta} / ${suffix}`;
}

export function useInspirationWorkspace() {
  const [rawPrompt, setRawPrompt] = useState("");
  const [refinedPrompt, setRefinedPrompt] = useState("");
  const [promptInputMode, setPromptInputMode] = useState("raw");
  const [submittedRawPrompt, setSubmittedRawPrompt] = useState("");
  const [submittedRefinedPrompt, setSubmittedRefinedPrompt] = useState("");
  const [submittedPrompt, setSubmittedPrompt] = useState("");
  const [submittedPromptSource, setSubmittedPromptSource] = useState(null);
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
  const [generationError, setGenerationError] = useState("");
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
  const taskRequest = buildInspirationTaskRequest({
    imageUrl,
    rawPrompt,
    refinedPrompt: promptInputMode === "refined" ? refinedPrompt : ""
  });

  useEffect(() => {
    previewUrlRef.current = previewUrl;
  }, [previewUrl]);

  useEffect(() => {
    const snapshot = readInspirationWorkspaceSnapshot();

    if (snapshot) {
      const nextPreviewUrl = snapshot.imageUrl || snapshot.fileUrl || "";

      setRawPrompt(snapshot.rawPrompt || snapshot.prompt || "");
      setRefinedPrompt(snapshot.refinedPrompt || "");
      setPromptInputMode(
        snapshot.promptInputMode || (snapshot.refinedPrompt ? "refined" : "raw")
      );
      setSubmittedRawPrompt(snapshot.rawPrompt || snapshot.prompt || "");
      setSubmittedRefinedPrompt(snapshot.refinedPrompt || "");
      setSubmittedPrompt(
        buildInspirationTaskRequest({
          rawPrompt: snapshot.rawPrompt || snapshot.prompt || "",
          refinedPrompt: snapshot.refinedPrompt || ""
        }).prompt
      );
      setSubmittedPromptSource(
        buildInspirationTaskRequest({
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
      setGenerationError(snapshot.generationError || "");
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
      clearInspirationWorkspaceSnapshot();
      return;
    }

    writeInspirationWorkspaceSnapshot({
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
      generationError
    });
  }, [
    backendTaskStatus,
    filePath,
    fileUrl,
    generationError,
    imageMeta,
    imageName,
    imageUrl,
    previewUrl,
    promptInputMode,
    rawPrompt,
    refinedPrompt,
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

  function resetTaskState(nextStatus = "idle") {
    cancelPendingTaskCreation();
    setTaskId("");
    setBackendTaskStatus("");
    setResultUrl("");
    setGenerationError("");
    setDownloadError("");
    setSubmittedRawPrompt("");
    setSubmittedRefinedPrompt("");
    setSubmittedPrompt("");
    setSubmittedPromptSource(null);
    setStatus(nextStatus);
  }

  function clearPromptErrorIfNeeded(nextPrompt) {
    if (typeof nextPrompt === "string" && nextPrompt.trim()) {
      setPromptError("");
    }
  }

  function handlePromptChange(event) {
    const nextPrompt = event.target.value;

    cancelPendingPromptRefine();
    setPromptRefineError("");

    if (promptInputMode === "refined") {
      if (nextPrompt === "") {
        setRawPrompt("");
        setRefinedPrompt("");
        setPromptInputMode("raw");
      } else {
        setRefinedPrompt(nextPrompt);
      }
    } else {
      setRawPrompt(nextPrompt);
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
    resetTaskState("idle");

    const nextPreviewUrl = URL.createObjectURL(file);
    const nextImageMeta = formatFileMeta(file);

    setUploadError("");
    setPromptError("");
    setGenerationError("");
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
    resetTaskState("idle");

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

  async function handleStartGeneration() {
    if (isUploading || isCreatingTask || status === "generating") {
      return;
    }

    let nextGenerationError = "";
    let nextPromptError = "";

    if (!imageUrl) {
      nextGenerationError = ERROR_UPLOAD_FIRST;
    }

    if (!taskRequest.prompt) {
      nextPromptError = ERROR_PROMPT_REQUIRED;
      nextGenerationError =
        nextGenerationError || ERROR_PROMPT_BEFORE_GENERATION;
    }

    setPromptError(nextPromptError);
    setGenerationError(nextGenerationError);
    setDownloadError("");

    if (nextGenerationError || nextPromptError) {
      return;
    }

    setIsCreatingTask(true);
    setTaskId("");
    setBackendTaskStatus("");
    setGenerationError("");
    setResultUrl("");

    const controller = new AbortController();
    createTaskAbortRef.current = controller;

    try {
      const task = await createInspirationTask(taskRequest, controller.signal);

      if (createTaskAbortRef.current !== controller) {
        return;
      }

      setSubmittedRawPrompt(taskRequest.rawPrompt);
      setSubmittedRefinedPrompt(taskRequest.refinedPrompt);
      setSubmittedPrompt(taskRequest.prompt);
      setSubmittedPromptSource(taskRequest.promptSource);
      setTaskId(String(task.id));
      setBackendTaskStatus(
        task.status || BACKEND_INSPIRATION_TASK_STATUS.PENDING
      );
      setStatus("generating");
      setGenerationError("");
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
      setStatus(imageUrl ? "ready" : "idle");
      setGenerationError(error.message || ERROR_CREATE_TASK_RETRY);
    } finally {
      if (createTaskAbortRef.current === controller) {
        createTaskAbortRef.current = null;
        setIsCreatingTask(false);
      }
    }
  }

  const { isPolling, pollError } = useInspirationTaskPolling({
    taskId,
    enabled: status === "generating" && Boolean(taskId),
    onTaskUpdate: (task) => {
      setBackendTaskStatus(task.status || "");

      if (!isTerminalInspirationTaskStatus(task.status)) {
        setStatus("generating");
      }
    },
    onTaskCompleted: (task) => {
      setBackendTaskStatus(
        task.status || BACKEND_INSPIRATION_TASK_STATUS.COMPLETED
      );
      setStatus("success");
      setGenerationError("");
      setDownloadError("");
      setResultUrl(
        resolveResultPreviewUrl(
          task.resultImageUrl,
          imageUrl || fileUrl || previewUrlRef.current
        )
      );
    },
    onTaskFailed: (task) => {
      setBackendTaskStatus(
        task.status || BACKEND_INSPIRATION_TASK_STATUS.FAILED
      );
      setStatus("error");
      setResultUrl("");
      setGenerationError(task.errorMessage || ERROR_TASK_FAILED);
    },
    onPollError: (error) => {
      if (error.status === 400 || error.status === 404) {
        setStatus("error");
        setGenerationError(error.message || ERROR_TASK_NOT_FOUND);
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
      await downloadInspirationResult(taskId);
    } catch (error) {
      setDownloadError(error.message || ERROR_DOWNLOAD_RETRY);
    } finally {
      setIsDownloading(false);
    }
  }

  return {
    rawPrompt,
    refinedPrompt,
    activePrompt: taskId && submittedPrompt ? submittedPrompt : taskRequest.prompt,
    activePromptSource:
      taskId && submittedPromptSource
        ? submittedPromptSource
        : taskRequest.promptSource,
    activeRawPrompt:
      taskId && submittedPrompt ? submittedRawPrompt : taskRequest.rawPrompt,
    activeRefinedPrompt:
      taskId && submittedPrompt
        ? submittedRefinedPrompt
        : taskRequest.refinedPrompt,
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
    generationError,
    downloadError,
    pollError,
    isUploading,
    isRefiningPrompt,
    isCreatingTask,
    isDownloading,
    isPolling,
    promptValue,
    isPromptRefined: promptInputMode === "refined" && Boolean(refinedPrompt.trim()),
    canStart: !isUploading && !isCreatingTask && status !== "generating",
    hasImage: Boolean(imageUrl || previewUrl),
    handlePromptChange,
    handleRefinePrompt,
    handleSelectImage,
    handleClearImage,
    handleStartGeneration,
    handleDownloadResult
  };
}
