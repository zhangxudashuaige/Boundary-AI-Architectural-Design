import { Panel } from "@/components/ui/panel";

const statusMap = {
  idle: {
    label: "等待上传",
    title: "等待参考图上传",
    description: "请先完成图片上传。上传成功后，右侧结果区会进入待生成状态。",
    badgeClass: "ui-chip"
  },
  ready: {
    label: "待生成",
    title: "图片与描述已就绪",
    description: "点击开始渲染后，前端会调用真实的任务创建接口，并自动开始轮询任务状态。",
    badgeClass: "ui-chip-accent"
  },
  generating: {
    label: "生成中",
    title: "正在轮询渲染任务状态",
    description: "当前已经拿到 taskId。前端会按固定间隔查询后端状态，并在任务完成后自动停止。",
    badgeClass:
      "inline-flex items-center rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1.5 text-xs uppercase tracking-[0.24em] text-amber-100"
  },
  success: {
    label: "生成成功",
    title: "渲染结果已生成",
    description: "后端任务已经完成，轮询已自动停止。",
    badgeClass:
      "inline-flex items-center rounded-full border border-emerald/20 bg-emerald/10 px-3 py-1.5 text-xs uppercase tracking-[0.24em] text-emerald-100"
  },
  error: {
    label: "生成失败",
    title: "本次渲染未成功完成",
    description: "后端任务失败或查询被终止。轮询已停止。",
    badgeClass:
      "inline-flex items-center rounded-full border border-rose-400/20 bg-rose-400/10 px-3 py-1.5 text-xs uppercase tracking-[0.24em] text-rose-100"
  }
};

function getStats(status, taskId, backendTaskStatus, isPolling) {
  return [
    {
      label: "任务状态",
      value:
        status === "idle"
          ? "等待上传"
          : status === "ready"
            ? "待生成"
            : status === "generating"
              ? "生成中"
              : status === "success"
                ? "生成成功"
                : "生成失败"
    },
    {
      label: "任务 ID",
      value: taskId || "--"
    },
    {
      label: "后端状态",
      value: backendTaskStatus || "--"
    },
    {
      label: "轮询状态",
      value: isPolling ? "轮询中" : "已停止"
    }
  ];
}

export function RenderResult({
  status,
  hasImage,
  resultUrl,
  taskId,
  backendTaskStatus,
  renderError,
  pollError,
  isPolling,
  onRetry,
  onDownload
}) {
  const current = statusMap[status];
  const stats = getStats(status, taskId, backendTaskStatus, isPolling);

  return (
    <Panel className="flex h-full flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-accent">Render Result</p>
          <h2 className="mt-3 text-2xl font-semibold text-white">结果展示区域</h2>
        </div>
        <span className={current.badgeClass}>{current.label}</span>
      </div>

      <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-slate-950/60 p-4">
        <div
          className={[
            "ui-preview-shell aspect-[16/10] border-dashed border-white/[0.15]",
            status === "generating" ? "is-loading" : ""
          ].join(" ")}
        >
          <div className="flex h-full flex-col justify-between p-6">
            <div className="flex items-center justify-between text-xs uppercase tracking-[0.24em] text-slate-500">
              <span>Render Preview</span>
              <span>Task Monitor</span>
            </div>

            {status === "success" && resultUrl ? (
              <div className="space-y-4">
                <div className="overflow-hidden rounded-[20px] border border-white/10 bg-black/[0.15]">
                  <img
                    src={resultUrl}
                    alt="渲染结果预览"
                    className="aspect-[16/10] w-full object-cover"
                  />
                </div>
              </div>
            ) : status === "generating" ? (
              <div className="space-y-6 text-center">
                <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full border border-amber-300/20 bg-amber-300/10">
                  <div className="h-12 w-12 animate-spin rounded-full border-2 border-amber-100/30 border-t-amber-100" />
                </div>
                <div>
                  <p className="text-xl font-semibold text-white">{current.title}</p>
                  <p className="mt-2 max-w-md text-sm leading-6 text-slate-400">
                    {current.description}
                  </p>
                </div>
                {taskId ? (
                  <div className="mx-auto rounded-full border border-amber-300/20 bg-amber-300/10 px-4 py-2 text-sm text-amber-100">
                    当前 taskId：{taskId}
                  </div>
                ) : null}
                <div className="ui-loading-bars mx-auto flex h-12 max-w-[220px] items-end justify-center gap-2">
                  <span className="h-8 w-2 rounded-full bg-amber-100/50" />
                  <span className="h-10 w-2 rounded-full bg-amber-100/60" />
                  <span className="h-12 w-2 rounded-full bg-amber-100/70" />
                  <span className="h-9 w-2 rounded-full bg-amber-100/55" />
                </div>
              </div>
            ) : (
              <div className="space-y-4 text-center">
                <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full border border-white/10 bg-white/5 text-xs uppercase tracking-[0.28em] text-slate-500">
                  {status === "error" ? "Error" : "Preview"}
                </div>
                <div>
                  <p className="text-xl font-semibold text-white">{current.title}</p>
                  <p className="mt-2 max-w-md text-sm leading-6 text-slate-400">
                    {current.description}
                  </p>
                </div>
              </div>
            )}

            <div
              className={[
                "rounded-2xl border px-4 py-3 text-sm",
                renderError && status !== "generating"
                  ? "border-rose-500/20 bg-rose-500/10 text-rose-100"
                  : pollError && status === "generating"
                    ? "border-amber-300/20 bg-amber-300/10 text-amber-100"
                    : "border-white/[0.08] bg-black/20 text-slate-300"
              ].join(" ")}
            >
              {renderError && status !== "generating" ? renderError : null}
              {!renderError && pollError && status === "generating"
                ? `最近一次状态查询失败，系统会继续重试。${pollError}`
                : null}
              {!renderError &&
                !pollError &&
                status === "idle" &&
                "请先完成图片上传，结果区域目前保持默认空状态。"}
              {!renderError &&
                !pollError &&
                status === "ready" &&
                "图片已经上传成功。点击开始渲染后，页面会提交 imageUrl 和 prompt 到后端创建任务。"}
              {!renderError &&
                !pollError &&
                status === "generating" &&
                "轮询正在运行中。任务一旦完成或失败，前端会自动停止继续请求。"}
              {!renderError &&
                !pollError &&
                status === "success" &&
                "当前任务已经完成，页面刷新后也会恢复到最近一次结果状态。"}
              {!renderError &&
                !pollError &&
                status === "error" &&
                "当前任务状态为失败。可以重新修改 prompt 后再次创建任务。"}
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={onDownload}
          disabled={status !== "success"}
          className="ui-button-secondary"
        >
          下载按钮占位
        </button>
        <button
          type="button"
          onClick={onRetry}
          disabled={!hasImage || status === "generating"}
          className="ui-button-ghost"
        >
          再生成按钮占位
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((item) => (
          <div
            key={item.label}
            className="ui-stat-card"
          >
            <p className="text-sm text-slate-400">{item.label}</p>
            <p className="mt-2 break-all text-base font-semibold text-white">{item.value}</p>
          </div>
        ))}
      </div>
    </Panel>
  );
}
