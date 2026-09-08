function getPrimaryActionLabel(status, isUploading, isCreatingTask) {
  if (isUploading) {
    return "图片上传中";
  }

  if (isCreatingTask) {
    return "正在创建任务";
  }

  if (status === "generating") {
    return "正在生成";
  }

  return "开始生成";
}

export function ActionPanel({
  status,
  canStart,
  isUploading,
  isCreatingTask,
  onStartRender
}) {
  return (
    <div className="mt-auto pt-5">
      <button
        type="button"
        onClick={onStartRender}
        disabled={!canStart}
        className="inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-[16px] border border-violet-300/20 bg-violet-500 px-5 py-4 text-base font-semibold text-white transition duration-200 hover:bg-violet-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-300/70 disabled:cursor-not-allowed disabled:border-white/5 disabled:bg-white/[0.06] disabled:text-white/25"
      >
        <span aria-hidden="true">✦</span>
        {getPrimaryActionLabel(status, isUploading, isCreatingTask)}
      </button>
    </div>
  );
}
