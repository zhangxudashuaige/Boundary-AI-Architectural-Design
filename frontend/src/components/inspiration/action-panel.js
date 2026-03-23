function getPrimaryActionLabel(status, isUploading, isCreatingTask) {
  if (isUploading) {
    return "图片上传中...";
  }

  if (isCreatingTask) {
    return "任务创建中...";
  }

  if (status === "generating") {
    return "生成中...";
  }

  return "开始生成";
}

export function ActionPanel({
  status,
  canStart,
  isUploading,
  isCreatingTask,
  onStartGeneration
}) {
  return (
    <div className="pt-1">
      <button
        type="button"
        onClick={onStartGeneration}
        disabled={!canStart}
        className="inline-flex w-full items-center justify-center rounded-[22px] border border-black/18 bg-white px-5 py-4 text-base font-semibold text-slate-950 transition duration-200 hover:bg-[#f3f3ee] disabled:cursor-not-allowed disabled:border-black/8 disabled:bg-[#f7f7f4] disabled:text-slate-400"
      >
        {getPrimaryActionLabel(status, isUploading, isCreatingTask)}
      </button>
    </div>
  );
}
