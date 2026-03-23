function getStatusClass(variant) {
  if (variant === "emerald") {
    return "inline-flex items-center rounded-full border border-black/16 bg-white/90 px-3.5 py-2 text-xs uppercase tracking-[0.2em] text-slate-900";
  }

  if (variant === "amber") {
    return "inline-flex items-center rounded-full border border-black/14 bg-[#fafaf6] px-3.5 py-2 text-xs uppercase tracking-[0.2em] text-slate-900";
  }

  if (variant === "rose") {
    return "inline-flex items-center rounded-full border border-black/12 bg-[#f7f7f3] px-3.5 py-2 text-xs uppercase tracking-[0.2em] text-slate-800";
  }

  return "inline-flex items-center rounded-full border border-black/10 bg-white px-3.5 py-2 text-xs uppercase tracking-[0.2em] text-slate-700";
}

function PromptBlock({ title, value }) {
  if (!value) {
    return null;
  }

  return (
    <div className="ui-soft-block px-4 py-3">
      <p className="ui-section-kicker">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-900">{value}</p>
    </div>
  );
}

function HistoryActions({
  canDownload,
  isDownloading,
  downloadError,
  onDownload,
  canDelete,
  isDeleting,
  deleteError,
  onDelete
}) {
  if (!canDownload && !canDelete) {
    return null;
  }

  return (
    <div className="mt-5 space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        {canDownload ? (
          <button
            type="button"
            onClick={onDownload}
            disabled={isDownloading || isDeleting}
            className="ui-button-secondary w-full justify-center rounded-[20px]"
          >
            {isDownloading ? "下载中..." : "下载图片"}
          </button>
        ) : null}

        {canDelete ? (
          <button
            type="button"
            onClick={onDelete}
            disabled={isDeleting || isDownloading}
            className="inline-flex w-full items-center justify-center rounded-[20px] border border-black/14 bg-white px-5 py-3 text-sm font-medium text-slate-950 transition hover:bg-[#f5f5f0] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isDeleting ? "删除中..." : "删除记录"}
          </button>
        ) : null}
      </div>

      {downloadError ? (
        <div className="ui-alert border-black/12 bg-[#fafaf6] text-slate-900">
          {downloadError}
        </div>
      ) : null}

      {deleteError ? (
        <div className="ui-alert border-black/12 bg-[#fafaf6] text-slate-900">
          {deleteError}
        </div>
      ) : null}
    </div>
  );
}

export function HistoryCard({
  title,
  status,
  time,
  category = "渲染记录",
  variant = "default",
  imageUrl = "",
  rawPrompt = "",
  refinedPrompt = "",
  canDownload = false,
  isDownloading = false,
  downloadError = "",
  onDownload,
  canDelete = false,
  isDeleting = false,
  deleteError = "",
  onDelete
}) {
  return (
    <article className="ui-gallery-card flex h-full flex-col">
      <div className="ui-gallery-media aspect-[4/5] p-0">
        {imageUrl ? (
          <div className="relative h-full w-full">
            <img
              src={imageUrl}
              alt={title}
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-white/16" />
            <div className="relative z-10 flex h-full flex-col justify-between p-5">
              <div className="flex items-center justify-between gap-3">
                <span className="ui-chip">{category}</span>
                <span className={getStatusClass(variant)}>{status}</span>
              </div>

              <div className="inline-flex items-center rounded-full border border-black/10 bg-white/88 px-4 py-2 text-xs uppercase tracking-[0.22em] text-slate-900 backdrop-blur-xl">
                {time}
              </div>
            </div>
          </div>
        ) : (
          <div className="ui-history-placeholder h-full w-full p-5">
            <div className="relative z-10 flex h-full flex-col justify-between">
              <div className="flex items-center justify-between gap-3">
                <span className="ui-chip">{category}</span>
                <span className={getStatusClass(variant)}>{status}</span>
              </div>

              <div className="inline-flex items-center rounded-full border border-black/10 bg-white/86 px-4 py-2 text-xs uppercase tracking-[0.22em] text-slate-700 backdrop-blur-xl">
                {time}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h2 className="text-xl font-semibold leading-8 text-slate-950">{title}</h2>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="ui-soft-block px-4 py-3">
            <p className="ui-section-kicker">记录时间</p>
            <p className="mt-2 text-sm font-medium text-slate-950">{time}</p>
          </div>
          <div className="ui-soft-block px-4 py-3">
            <p className="ui-section-kicker">当前状态</p>
            <p className="mt-2 text-sm font-medium text-slate-950">{status}</p>
          </div>
        </div>

        <div className="mt-5 grid gap-3">
          <PromptBlock title="原始描述" value={rawPrompt} />
          <PromptBlock title="AI优化后描述" value={refinedPrompt} />
        </div>

        <HistoryActions
          canDownload={canDownload}
          isDownloading={isDownloading}
          downloadError={downloadError}
          onDownload={onDownload}
          canDelete={canDelete}
          isDeleting={isDeleting}
          deleteError={deleteError}
          onDelete={onDelete}
        />
      </div>
    </article>
  );
}
