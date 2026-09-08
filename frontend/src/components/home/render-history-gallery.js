"use client";

import { useEffect, useMemo, useState } from "react";
import { getRenderHistory } from "@/lib/get-render-history";

const HISTORY_LIMIT = 30;

function resolveHistoryImage(task) {
  const resultImageUrl =
    typeof task?.resultImageUrl === "string" ? task.resultImageUrl.trim() : "";
  const sourceImageUrl =
    typeof task?.imageUrl === "string"
      ? task.imageUrl.trim()
      : typeof task?.inputFileUrl === "string"
        ? task.inputFileUrl.trim()
        : "";

  if (!resultImageUrl || resultImageUrl.includes("mock-render.local")) {
    return sourceImageUrl || resultImageUrl;
  }

  return resultImageUrl;
}

function formatTaskTime(value) {
  if (!value) {
    return "时间未知";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "时间未知";
  }

  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function getStatusLabel(status) {
  if (status === "completed") {
    return "已完成";
  }

  if (status === "processing") {
    return "生成中";
  }

  if (status === "failed") {
    return "失败";
  }

  if (status === "pending") {
    return "排队中";
  }

  return "未知";
}

export function RenderHistoryGallery({ refreshKey = "" }) {
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [selectedTaskId, setSelectedTaskId] = useState(null);

  useEffect(() => {
    const controller = new AbortController();

    setIsLoading(true);
    setErrorMessage("");

    getRenderHistory(
      {
        limit: HISTORY_LIMIT,
        offset: 0
      },
      controller.signal
    )
      .then((result) => {
        setTasks(result.tasks);
      })
      .catch((error) => {
        if (error?.name !== "AbortError") {
          setErrorMessage(error.message || "获取历史记录失败，请稍后重试。");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      });

    return () => controller.abort();
  }, [refreshKey, reloadKey]);

  const historyItems = useMemo(
    () =>
      tasks.map((task) => ({
        id: String(task.id),
        title:
          typeof task.prompt === "string" && task.prompt.trim()
            ? task.prompt.trim()
            : `渲染任务 #${task.id}`,
        time: formatTaskTime(task.createdAt),
        status: getStatusLabel(task.status),
        imageUrl: resolveHistoryImage(task)
      })),
    [tasks]
  );

  const selectedItem = historyItems.find((item) => item.id === selectedTaskId);

  if (isLoading) {
    return (
      <div className="grid h-full grid-cols-2 gap-3 p-1 md:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 8 }).map((_, index) => (
          <div
            key={index}
            className="aspect-[4/3] animate-pulse rounded-[16px] border border-white/5 bg-white/[0.04]"
          />
        ))}
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-6 text-center">
        <p className="text-base font-medium text-white">历史记录加载失败</p>
        <p className="mt-2 max-w-md text-sm leading-6 text-white/45">
          {errorMessage}
        </p>
        <button
          type="button"
          onClick={() => setReloadKey((value) => value + 1)}
          className="mt-5 rounded-[12px] border border-white/15 bg-white/[0.05] px-4 py-2 text-sm text-white/80 transition hover:bg-white/10"
        >
          重新加载
        </button>
      </div>
    );
  }

  if (historyItems.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-2xl text-white/50">
          ◫
        </div>
        <p className="mt-5 text-base font-medium text-white">暂无历史记录</p>
        <p className="mt-2 text-sm text-white/40">完成一次生成后会显示在这里</p>
      </div>
    );
  }

  if (selectedItem) {
    return (
      <div className="flex h-full min-h-0 flex-col">
        <div className="mb-3 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setSelectedTaskId(null)}
            className="rounded-[12px] border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white/75 transition hover:bg-white/[0.08]"
          >
            返回全部
          </button>
          <span className="text-xs text-white/40">{selectedItem.time}</span>
        </div>

        <div className="relative min-h-[360px] flex-1 overflow-hidden rounded-[16px] border border-white/10 bg-black">
          {selectedItem.imageUrl ? (
            <img
              src={selectedItem.imageUrl}
              alt={selectedItem.title}
              className="absolute inset-0 h-full w-full object-contain"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-white/35">
              该记录暂无可预览图片
            </div>
          )}
        </div>

        <div className="mt-3 rounded-[14px] border border-white/10 bg-white/[0.025] px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <p className="line-clamp-2 text-sm leading-6 text-white/75">
              {selectedItem.title}
            </p>
            <span className="shrink-0 text-xs text-white/40">
              {selectedItem.status}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="grid h-full content-start grid-cols-2 gap-3 overflow-y-auto pr-1 md:grid-cols-3 xl:grid-cols-4">
      {historyItems.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => setSelectedTaskId(item.id)}
          className="group overflow-hidden rounded-[16px] border border-white/10 bg-white/[0.025] text-left transition hover:border-white/25 hover:bg-white/[0.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60"
        >
          <span className="relative block aspect-[4/3] overflow-hidden bg-black">
            {item.imageUrl ? (
              <img
                src={item.imageUrl}
                alt=""
                className="absolute inset-0 h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
              />
            ) : (
              <span className="flex h-full items-center justify-center text-xs text-white/30">
                暂无预览
              </span>
            )}
          </span>
          <span className="block p-3">
            <span className="line-clamp-2 block text-xs leading-5 text-white/65">
              {item.title}
            </span>
            <span className="mt-2 flex items-center justify-between gap-2 text-[11px] text-white/35">
              <span>{item.time}</span>
              <span>{item.status}</span>
            </span>
          </span>
        </button>
      ))}
    </div>
  );
}
