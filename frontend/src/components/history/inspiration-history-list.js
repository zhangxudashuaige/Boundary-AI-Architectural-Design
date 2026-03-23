"use client";

import { useEffect, useMemo, useState } from "react";
import { HistoryCard } from "@/components/history/history-card";
import { deleteInspirationTask } from "@/lib/delete-inspiration-task";
import { downloadInspirationResult } from "@/lib/download-inspiration-result";
import { getInspirationHistory } from "@/lib/get-inspiration-history";

const HISTORY_PAGE_SIZE = 24;
const MOCK_IMAGE_EDIT_HOST = "mock-image-edit.local";
const DOWNLOAD_ERROR_FALLBACK = "下载图片失败，请稍后重试。";
const DELETE_ERROR_FALLBACK = "删除历史记录失败，请稍后重试。";
const HISTORY_ERROR_FALLBACK = "获取历史记录失败，请稍后重试。";
const DELETE_CONFIRM_TEXT = "确定删除这条历史记录吗？";

function formatTaskTime(value) {
  if (!value) {
    return "--";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "--";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function getStatusMeta(status) {
  if (status === "completed") {
    return { label: "已完成", variant: "emerald" };
  }

  if (status === "processing") {
    return { label: "生成中", variant: "amber" };
  }

  if (status === "failed") {
    return { label: "失败", variant: "rose" };
  }

  if (status === "pending") {
    return { label: "排队中", variant: "default" };
  }

  return { label: "未知", variant: "default" };
}

function buildHistoryTitle(task) {
  const prompt = typeof task?.prompt === "string" ? task.prompt.trim() : "";

  if (prompt) {
    return prompt.slice(0, 28);
  }

  return `任务 #${task?.id || "--"}`;
}

function resolveHistoryImage(task) {
  const resultImageUrl =
    typeof task?.resultImageUrl === "string" ? task.resultImageUrl.trim() : "";
  const sourceImageUrl =
    typeof task?.imageUrl === "string"
      ? task.imageUrl.trim()
      : typeof task?.inputFileUrl === "string"
        ? task.inputFileUrl.trim()
        : "";

  if (!resultImageUrl) {
    return sourceImageUrl;
  }

  if (resultImageUrl.includes(MOCK_IMAGE_EDIT_HOST)) {
    return sourceImageUrl || resultImageUrl;
  }

  return resultImageUrl;
}

function normalizePrompt(value) {
  return typeof value === "string" ? value.trim() : "";
}

function LoadingState() {
  return (
    <div className="ui-gallery-card rounded-[28px] p-6">
      <h3 className="text-2xl font-semibold text-slate-950">加载中...</h3>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="ui-gallery-card rounded-[28px] p-6">
      <h3 className="text-2xl font-semibold text-slate-950">暂无历史记录</h3>
    </div>
  );
}

function ErrorState({ message, onRetry }) {
  return (
    <div className="ui-gallery-card rounded-[28px] p-6">
      <h3 className="text-2xl font-semibold text-slate-950">历史记录加载失败</h3>
      <p className="mt-3 text-sm leading-7 text-slate-600">{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="ui-button-secondary mt-5 rounded-[20px]"
      >
        重新加载
      </button>
    </div>
  );
}

export function InspirationHistoryList({
  limit = HISTORY_PAGE_SIZE,
  refreshKey = ""
}) {
  const [tasks, setTasks] = useState([]);
  const [historyError, setHistoryError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);
  const [downloadingTaskId, setDownloadingTaskId] = useState(null);
  const [deletingTaskId, setDeletingTaskId] = useState(null);
  const [downloadErrors, setDownloadErrors] = useState({});
  const [deleteErrors, setDeleteErrors] = useState({});

  useEffect(() => {
    const controller = new AbortController();

    setIsLoading(true);
    setHistoryError("");

    getInspirationHistory(
      {
        limit,
        offset: 0
      },
      controller.signal
    )
      .then((result) => {
        setTasks(result.tasks);
      })
      .catch((error) => {
        if (error?.name === "AbortError") {
          return;
        }

        setHistoryError(error.message || HISTORY_ERROR_FALLBACK);
      })
      .finally(() => {
        setIsLoading(false);
      });

    return () => {
      controller.abort();
    };
  }, [limit, refreshKey, reloadKey]);

  const historyCards = useMemo(
    () =>
      tasks.map((task) => {
        const statusMeta = getStatusMeta(task.status);
        const rawPrompt = normalizePrompt(task.rawPrompt || task.prompt);
        const refinedPrompt = normalizePrompt(task.optimizedPrompt);

        return {
          key: String(task.id),
          taskId: task.id,
          title: buildHistoryTitle(task),
          status: statusMeta.label,
          time: formatTaskTime(task.createdAt),
          category: "灵感记录",
          variant: statusMeta.variant,
          imageUrl: resolveHistoryImage(task),
          rawPrompt,
          refinedPrompt:
            refinedPrompt && refinedPrompt !== rawPrompt ? refinedPrompt : "",
          canDownload: task.status === "completed",
          canDelete: task.status === "completed" || task.status === "failed"
        };
      }),
    [tasks]
  );

  async function handleDownload(taskId) {
    if (!taskId || downloadingTaskId === taskId) {
      return;
    }

    setDownloadingTaskId(taskId);
    setDownloadErrors((previous) => ({
      ...previous,
      [taskId]: ""
    }));

    try {
      await downloadInspirationResult(taskId);
    } catch (error) {
      setDownloadErrors((previous) => ({
        ...previous,
        [taskId]: error.message || DOWNLOAD_ERROR_FALLBACK
      }));
    } finally {
      setDownloadingTaskId(null);
    }
  }

  async function handleDelete(taskId) {
    if (!taskId || deletingTaskId === taskId) {
      return;
    }

    if (!window.confirm(DELETE_CONFIRM_TEXT)) {
      return;
    }

    setDeletingTaskId(taskId);
    setDeleteErrors((previous) => ({
      ...previous,
      [taskId]: ""
    }));

    try {
      await deleteInspirationTask(taskId);
      setTasks((previous) => previous.filter((task) => task.id !== taskId));
      setDownloadErrors((previous) => {
        const next = { ...previous };
        delete next[taskId];
        return next;
      });
      setDeleteErrors((previous) => {
        const next = { ...previous };
        delete next[taskId];
        return next;
      });
    } catch (error) {
      setDeleteErrors((previous) => ({
        ...previous,
        [taskId]: error.message || DELETE_ERROR_FALLBACK
      }));
    } finally {
      setDeletingTaskId(null);
    }
  }

  if (isLoading) {
    return <LoadingState />;
  }

  if (historyError) {
    return (
      <ErrorState
        message={historyError}
        onRetry={() => setReloadKey((value) => value + 1)}
      />
    );
  }

  if (historyCards.length === 0) {
    return <EmptyState />;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
      {historyCards.map((item) => (
        <HistoryCard
          key={item.key}
          title={item.title}
          status={item.status}
          time={item.time}
          category={item.category}
          variant={item.variant}
          imageUrl={item.imageUrl}
          rawPrompt={item.rawPrompt}
          refinedPrompt={item.refinedPrompt}
          canDownload={item.canDownload}
          isDownloading={downloadingTaskId === item.taskId}
          downloadError={downloadErrors[item.taskId] || ""}
          onDownload={() => handleDownload(item.taskId)}
          canDelete={item.canDelete}
          isDeleting={deletingTaskId === item.taskId}
          deleteError={deleteErrors[item.taskId] || ""}
          onDelete={() => handleDelete(item.taskId)}
        />
      ))}
    </div>
  );
}
