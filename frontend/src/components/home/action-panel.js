import Link from "next/link";
import { Panel } from "@/components/ui/panel";

const statusCopy = {
  idle: "请先上传图片，再填写渲染描述。当前不会创建渲染任务。",
  uploading: "图片正在上传到后端，请稍候。上传成功后才可以创建渲染任务。",
  ready: "图片与描述就绪后，点击开始渲染会调用真实的任务创建接口。",
  creatingTask: "正在向后端提交渲染任务，请等待服务返回 taskId。",
  generating: "渲染任务已创建，前端正在自动轮询任务状态。",
  success: "当前任务已经完成。",
  error: "当前任务已失败或状态查询被中止。"
};

function formatBackendStatus(status) {
  if (!status) {
    return "--";
  }

  return status;
}

export function ActionPanel({
  status,
  canStart,
  isUploading,
  isCreatingTask,
  isPolling,
  taskId,
  backendTaskStatus,
  renderError,
  pollError,
  onStartRender
}) {
  const currentStatus = isUploading
    ? "uploading"
    : isCreatingTask
      ? "creatingTask"
      : status;

  return (
    <Panel className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-accent">Action Area</p>
          <h2 className="mt-3 text-2xl font-semibold text-white">操作按钮</h2>
        </div>
        <span className="ui-chip">Step 03</span>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <button
          type="button"
          onClick={onStartRender}
          disabled={!canStart}
          className="ui-button-primary"
        >
          {isUploading
            ? "图片上传中..."
            : isCreatingTask
              ? "创建任务中..."
              : status === "generating"
                ? "轮询中..."
                : "开始渲染"}
        </button>
        <Link
          href="/history"
          className="ui-button-secondary"
        >
          查看历史
        </Link>
        <div className="ui-button-ghost">
          自动轮询已接入
        </div>
      </div>

      {taskId ? (
        <div className="rounded-2xl border border-emerald/20 bg-emerald/10 px-4 py-3 text-sm text-emerald-100">
          当前任务 ID：<span className="font-semibold">{taskId}</span>
          <span className="ml-3 text-emerald-50/90">
            后端状态：{formatBackendStatus(backendTaskStatus)}
          </span>
        </div>
      ) : null}

      {pollError && status === "generating" ? (
        <div className="rounded-2xl border border-amber-300/20 bg-amber-300/10 px-4 py-3 text-sm text-amber-100">
          状态查询暂时失败，前端会继续自动重试。{pollError}
        </div>
      ) : null}

      {renderError && status !== "generating" ? (
        <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
          {renderError}
        </div>
      ) : null}

      <div className="ui-subtle-card px-5 py-4">
        <p className="text-sm font-medium text-white">当前提示</p>
        <p className="mt-2 text-sm leading-7 text-slate-300">{statusCopy[currentStatus]}</p>
        <p className="mt-3 text-xs leading-6 text-slate-500">
          {isPolling
            ? "当前仅保留一个轮询请求链路，任务完成或失败后会自动停止。"
            : "页面刷新后会恢复 taskId、图片地址和 prompt，并在需要时继续轮询。"}
        </p>
      </div>
    </Panel>
  );
}
