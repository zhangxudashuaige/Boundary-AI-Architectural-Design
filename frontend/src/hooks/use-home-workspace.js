"use client";

import { useEffect, useRef, useState } from "react";
import {
  BACKEND_RENDER_TASK_STATUS,
  isTerminalRenderTaskStatus
} from "@/config/render-task";
import { formatFileMeta, validateImageFile } from "@/config/upload";
import { createRenderTask } from "@/lib/create-render-task";
import {
  clearHomeWorkspaceSnapshot,
  readHomeWorkspaceSnapshot,
  writeHomeWorkspaceSnapshot
} from "@/lib/home-workspace-storage";
import { uploadImage } from "@/lib/upload-image";
import { useRenderTaskPolling } from "@/hooks/use-render-task-polling";

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

  if (taskResultImageUrl.includes("mock-render.local")) {
    return fallbackImageUrl || taskResultImageUrl;
  }

  return taskResultImageUrl;
}

export function useHomeWorkspace() {
  const [prompt, setPrompt] = useState("");
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
  const [renderError, setRenderError] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isCreatingTask, setIsCreatingTask] = useState(false);

  const uploadAbortRef = useRef(null);
  const createTaskAbortRef = useRef(null);
  const previewUrlRef = useRef("");
  const hasRestoredRef = useRef(false);

  useEffect(() => {
    previewUrlRef.current = previewUrl;
  }, [previewUrl]);

  useEffect(() => {
    const snapshot = readHomeWorkspaceSnapshot();

    if (snapshot) {
      const nextPreviewUrl = snapshot.imageUrl || snapshot.fileUrl || "";

      setPrompt(snapshot.prompt || "");
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
      cancelPendingTaskCreation(false);
      revokePreviewUrl(previewUrlRef.current);
    };
  }, []);

  useEffect(() => {
    if (!hasRestoredRef.current) {
      return;
    }

    if (!imageUrl && !previewUrl && !taskId && !prompt.trim()) {
      clearHomeWorkspaceSnapshot();
      return;
    }

    writeHomeWorkspaceSnapshot({
      prompt,
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
    prompt,
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

  function resetRenderTaskState(nextStatus = "idle") {
    cancelPendingTaskCreation();
    setTaskId("");
    setBackendTaskStatus("");
    setResultUrl("");
    setRenderError("");
    setStatus(nextStatus);
  }

  function handlePromptChange(event) {
    const nextPrompt = event.target.value;

    setPrompt(nextPrompt);

    if (nextPrompt.trim()) {
      setPromptError("");
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
    setImageName(file.name);
    setImageMeta(`${nextImageMeta} · 上传中`);
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
      setImageMeta(`${nextImageMeta} · 已上传`);
      setStatus("ready");
      setUploadError("");
    } catch (error) {
      if (error?.name === "AbortError") {
        return;
      }

      if (uploadAbortRef.current !== controller) {
        return;
      }

      setUploadError(error.message || "图片上传失败，请稍后重试。");
      setImageMeta(`${nextImageMeta} · 上传失败`);
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
    resetRenderTaskState("idle");

    setPreviewUrl((previousUrl) => {
      revokePreviewUrl(previousUrl);
      return "";
    });
    setPrompt("");
    setImageName("");
    setImageMeta("");
    setImageUrl("");
    setFileUrl("");
    setFilePath("");
    setUploadError("");
    setPromptError("");
    setResultUrl("");
  }

  async function handleStartRender() {
    if (isUploading || isCreatingTask || status === "generating") {
      return;
    }

    let nextRenderError = "";
    let nextPromptError = "";

    if (!imageUrl) {
      nextRenderError = "请先上传图片，上传成功后再开始渲染。";
    }

    if (!prompt.trim()) {
      nextPromptError = "请输入渲染描述。";
      nextRenderError = nextRenderError || "请补充渲染描述后再开始渲染。";
    }

    setPromptError(nextPromptError);
    setRenderError(nextRenderError);

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
        {
          imageUrl,
          prompt: prompt.trim()
        },
        controller.signal
      );

      if (createTaskAbortRef.current !== controller) {
        return;
      }

      setTaskId(String(task.id));
      setBackendTaskStatus(task.status || BACKEND_RENDER_TASK_STATUS.PENDING);
      setStatus("generating");
      setRenderError("");
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
      setRenderError(error.message || "创建渲染任务失败，请稍后重试。");
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
      setResultUrl(
        resolveResultPreviewUrl(task.resultImageUrl, imageUrl || fileUrl || previewUrlRef.current)
      );
    },
    onTaskFailed: (task) => {
      setBackendTaskStatus(task.status || BACKEND_RENDER_TASK_STATUS.FAILED);
      setStatus("error");
      setResultUrl("");
      setRenderError(task.errorMessage || "渲染任务执行失败。");
    },
    onPollError: (error) => {
      if (error.status === 400 || error.status === 404) {
        setStatus("error");
        setRenderError(error.message || "渲染任务不存在，无法继续查询状态。");
      }
    }
  });

  function handleDownloadPlaceholder() {
    if (status !== "success") {
      return;
    }

    window.alert("下载功能仍是占位逻辑，下一阶段会接入真实下载能力。");
  }

  return {
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
    canStart: !isUploading && !isCreatingTask && status !== "generating",
    hasImage: Boolean(imageUrl || previewUrl),
    handlePromptChange,
    handleSelectImage,
    handleClearImage,
    handleStartRender,
    handleDownloadPlaceholder
  };
}
