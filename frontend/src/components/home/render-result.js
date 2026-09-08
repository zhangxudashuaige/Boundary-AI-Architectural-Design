"use client";

import { useEffect, useState } from "react";
import { RenderHistoryGallery } from "@/components/home/render-history-gallery";

const statusCopy = {
  idle: {
    title: "等待开始",
    description: "上传参考图片并输入文字描述，生成结果会显示在这里。"
  },
  ready: {
    title: "输入已就绪",
    description: "点击左侧的“开始生成”创建建筑效果图。"
  },
  generating: {
    title: "正在生成",
    description: "系统正在处理你的建筑设计，请稍候。"
  },
  error: {
    title: "生成失败",
    description: "请检查输入内容后重新尝试。"
  }
};

function WorkspaceTab({ isActive, children, onClick }) {
  return (
    <button
      type="button"
      aria-pressed={isActive}
      onClick={onClick}
      className={`min-w-[126px] rounded-[12px] px-5 py-3 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60 ${
        isActive
          ? "bg-white/[0.09] text-violet-200"
          : "text-white/45 hover:bg-white/[0.04] hover:text-white/75"
      }`}
    >
      {children}
    </button>
  );
}

function CurrentRenderView({ status, resultUrl, errorMessage }) {
  const copy = statusCopy[status] || statusCopy.idle;

  if (status === "success" && resultUrl) {
    return (
      <img
        src={resultUrl}
        alt="生成结果"
        className="absolute inset-0 h-full w-full object-contain"
      />
    );
  }

  if (status === "generating") {
    return (
      <div className="flex h-full flex-col items-center justify-center px-6 text-center">
        <div className="h-12 w-12 animate-spin rounded-full border-2 border-white/15 border-t-violet-300" />
        <h2 className="mt-6 text-xl font-semibold text-white">{copy.title}</h2>
        <p className="mt-2 text-sm leading-6 text-white/40">{copy.description}</p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex h-full flex-col items-center justify-center px-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full border border-red-400/25 bg-red-500/10 text-2xl text-red-200">
          !
        </div>
        <h2 className="mt-6 text-xl font-semibold text-white">{copy.title}</h2>
        <p className="mt-2 max-w-lg text-sm leading-6 text-white/45">
          {errorMessage || copy.description}
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col items-center justify-center px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-2xl text-white/45">
        ◫
      </div>
      <h2 className="mt-6 text-xl font-semibold text-white">{copy.title}</h2>
      <p className="mt-2 max-w-md text-sm leading-6 text-white/40">
        {copy.description}
      </p>
    </div>
  );
}

export function RenderResult({
  status,
  resultUrl,
  renderError,
  pollError,
  downloadError = "",
  isDownloading = false,
  onDownload,
  canRegenerate = false,
  isCreatingTask = false,
  onRegenerate,
  historyRefreshKey = ""
}) {
  const [activeView, setActiveView] = useState("current");
  const errorMessage = renderError || pollError || "";
  const hasResult = status === "success" && Boolean(resultUrl);

  useEffect(() => {
    if (status === "generating" || status === "success") {
      setActiveView("current");
    }
  }, [status, resultUrl]);

  return (
    <section className="flex min-h-[720px] flex-col rounded-[24px] border border-white/10 bg-[#111111] p-4 lg:min-h-[calc(100vh-2rem)] xl:p-5">
      <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
        <div>
          <p className="text-[11px] uppercase text-white/45">Workspace</p>
          <h1 className="mt-1 text-xl font-semibold text-white">渲染工作区</h1>
        </div>

        <div className="grid grid-cols-2 rounded-[15px] border border-white/10 bg-black/25 p-1">
          <WorkspaceTab
            isActive={activeView === "current"}
            onClick={() => setActiveView("current")}
          >
            当前生成
          </WorkspaceTab>
          <WorkspaceTab
            isActive={activeView === "history"}
            onClick={() => setActiveView("history")}
          >
            历史记录
          </WorkspaceTab>
        </div>
      </div>

      <div className="mt-4 flex min-h-0 flex-1 flex-col">
        <div className="relative min-h-[480px] flex-1 overflow-hidden rounded-[18px] border border-white/10 bg-[#080808] p-3">
          {activeView === "current" ? (
            <CurrentRenderView
              status={status}
              resultUrl={resultUrl}
              errorMessage={errorMessage}
            />
          ) : (
            <RenderHistoryGallery refreshKey={historyRefreshKey} />
          )}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <button
            type="button"
            onClick={onRegenerate}
            disabled={!canRegenerate || isCreatingTask || status === "generating"}
            className="min-h-12 rounded-[14px] border border-white/10 bg-white/[0.04] px-4 text-sm font-medium text-white/75 transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:text-white/20"
          >
            {isCreatingTask || status === "generating" ? "生成中" : "重新生成"}
          </button>

          <button
            type="button"
            onClick={onDownload}
            disabled={!hasResult || isDownloading}
            className="min-h-12 rounded-[14px] border border-white/10 bg-white/[0.04] px-4 text-sm font-medium text-white/75 transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:text-white/20"
          >
            {isDownloading ? "下载中" : "下载"}
          </button>

          <button
            type="button"
            onClick={() => setActiveView("history")}
            className="min-h-12 rounded-[14px] border border-violet-400/25 bg-violet-500/10 px-4 text-sm font-medium text-violet-200 transition hover:bg-violet-500/20"
          >
            查看历史
          </button>
        </div>

        {downloadError ? (
          <div className="mt-3 rounded-[14px] border border-red-400/25 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {downloadError}
          </div>
        ) : null}
      </div>
    </section>
  );
}
