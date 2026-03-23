import { Panel } from "@/components/ui/panel";

const statusMap = {
  idle: {
    title: "创建你的第一个作品",
    description: "上传图片并输入描述后，这里会显示生成结果。"
  },
  ready: {
    title: "可以开始渲染",
    description: "点击左侧按钮开始生成。"
  },
  generating: {
    title: "正在生成中",
    description: "请稍候，系统正在生成结果图。"
  },
  success: {
    title: "生成完成",
    description: ""
  },
  error: {
    title: "生成失败",
    description: "请调整输入内容后重新尝试。"
  }
};

function EmptyIcon() {
  return (
    <svg
      width="78"
      height="78"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      className="text-slate-500"
    >
      <path
        d="M5 19.5H19C19.2761 19.5 19.5 19.2761 19.5 19V8.5C19.5 8.22386 19.2761 8 19 8H15.9142C15.649 8 15.3946 7.89464 15.2071 7.70711L13.7929 6.29289C13.6054 6.10536 13.351 6 13.0858 6H5C4.72386 6 4.5 6.22386 4.5 6.5V19C4.5 19.2761 4.72386 19.5 5 19.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M8 16.5C9.16667 14.8333 10.5333 14 12.1 14C13.6667 14 14.9667 14.8333 16 16.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="9" cy="10" r="1.5" fill="currentColor" />
      <path
        d="M18.5 4.5L19 5.5L20 6L19 6.5L18.5 7.5L18 6.5L17 6L18 5.5L18.5 4.5Z"
        fill="currentColor"
      />
    </svg>
  );
}

function RenderEmptyState({ title, description }) {
  return (
    <div className="flex min-h-[820px] flex-col items-center justify-center px-6 text-center">
      <EmptyIcon />
      <h2 className="mt-8 text-4xl font-semibold text-slate-950">{title}</h2>
      {description ? (
        <p className="mt-4 max-w-md text-sm leading-7 text-slate-500">
          {description}
        </p>
      ) : null}
    </div>
  );
}

function RenderGeneratingState({ title, description }) {
  return (
    <div className="flex min-h-[820px] flex-col items-center justify-center px-6 text-center">
      <div className="flex h-24 w-24 items-center justify-center rounded-full border border-black/10 bg-[#fafaf6]">
        <div className="h-12 w-12 animate-spin rounded-full border-2 border-black/15 border-t-black/85" />
      </div>
      <h2 className="mt-8 text-4xl font-semibold text-slate-950">{title}</h2>
      <p className="mt-4 max-w-md text-sm leading-7 text-slate-500">
        {description}
      </p>
    </div>
  );
}

function RenderErrorState({ title, description, errorMessage }) {
  return (
    <div className="flex min-h-[820px] flex-col items-center justify-center px-6 text-center">
      <div className="flex h-24 w-24 items-center justify-center rounded-full border border-black/12 bg-[#fafaf6] text-3xl text-slate-950">
        !
      </div>
      <h2 className="mt-8 text-4xl font-semibold text-slate-950">{title}</h2>
      <p className="mt-4 max-w-md text-sm leading-7 text-slate-500">
        {description}
      </p>
      {errorMessage ? (
        <div className="mt-6 max-w-xl rounded-[20px] border border-black/12 bg-[#fafaf6] px-4 py-3 text-sm text-slate-900">
          {errorMessage}
        </div>
      ) : null}
    </div>
  );
}

function DownloadButton({ isDownloading, onDownload }) {
  return (
    <button
      type="button"
      onClick={onDownload}
      disabled={isDownloading}
      className="inline-flex items-center justify-center rounded-full border border-black/14 bg-white px-5 py-3 text-sm font-medium text-slate-950 shadow-[0_10px_22px_rgba(17,17,17,0.08)] transition hover:bg-[#f5f5f0] disabled:cursor-not-allowed disabled:opacity-60"
    >
      {isDownloading ? "下载中..." : "下载图片"}
    </button>
  );
}

export function RenderResult({
  status,
  resultUrl,
  renderError,
  pollError,
  downloadError = "",
  isDownloading = false,
  onDownload
}) {
  const current = statusMap[status] || statusMap.idle;
  const errorMessage = renderError || pollError || "";
  const showDownloadButton =
    status === "success" && resultUrl && typeof onDownload === "function";

  return (
    <Panel className="overflow-hidden p-0">
      <div className="relative min-h-[820px] overflow-hidden rounded-[30px] bg-[#fbfbf8]">
        {status === "success" && resultUrl ? (
          <img
            src={resultUrl}
            alt="生成结果"
            className="h-[820px] w-full object-cover"
          />
        ) : null}

        {status === "success" && resultUrl ? (
          <div className="absolute inset-0 bg-white/8" />
        ) : null}

        {showDownloadButton ? (
          <div className="absolute right-5 top-5 z-10 flex flex-col items-end gap-3">
            <DownloadButton isDownloading={isDownloading} onDownload={onDownload} />
            {downloadError ? (
              <div className="max-w-sm rounded-[18px] border border-black/12 bg-white/92 px-4 py-3 text-sm text-slate-900 backdrop-blur-xl">
                {downloadError}
              </div>
            ) : null}
          </div>
        ) : null}

        {status === "generating" ? (
          <RenderGeneratingState
            title={current.title}
            description={current.description}
          />
        ) : null}

        {status === "idle" || status === "ready" ? (
          <RenderEmptyState
            title={current.title}
            description={current.description}
          />
        ) : null}

        {status === "error" ? (
          <RenderErrorState
            title={current.title}
            description={current.description}
            errorMessage={errorMessage}
          />
        ) : null}
      </div>
    </Panel>
  );
}
