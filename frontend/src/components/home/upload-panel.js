import {
  ACCEPTED_UPLOAD_TYPES,
  MAX_UPLOAD_FILE_SIZE_LABEL
} from "@/config/upload";

const uploadRequirement = `支持 JPG / JPEG / PNG / WEBP，文件小于 ${MAX_UPLOAD_FILE_SIZE_LABEL}`;

function getUploadLabel({ isUploading, uploadError, imageUrl, previewUrl }) {
  if (isUploading) {
    return "上传中";
  }

  if (uploadError) {
    return "上传失败";
  }

  if (imageUrl) {
    return "已上传";
  }

  if (previewUrl) {
    return "已选择";
  }

  return "等待上传";
}

export function UploadPanel({
  previewUrl,
  imageUrl,
  uploadError,
  isUploading,
  onSelectImage,
  onClearImage
}) {
  const uploadLabel = getUploadLabel({
    isUploading,
    uploadError,
    imageUrl,
    previewUrl
  });

  return (
    <section>
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase text-white/45">Create</p>
          <h1 className="mt-1 text-2xl font-semibold text-white">图片生成</h1>
        </div>
        <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] text-white/55">
          {uploadLabel}
        </span>
      </div>

      <div className="mt-5">
        <p className="mb-3 text-sm font-medium text-white/85">上传参考图片</p>

        <div className="relative">
          <label className="block cursor-pointer">
            <input
              type="file"
              accept={ACCEPTED_UPLOAD_TYPES}
              className="sr-only"
              onChange={onSelectImage}
            />

            <span className="relative flex min-h-[210px] w-full overflow-hidden rounded-[18px] border border-dashed border-white/20 bg-white/[0.025] transition hover:border-white/35 hover:bg-white/[0.045]">
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="参考图预览"
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : (
                <span className="m-auto flex flex-col items-center px-5 text-center">
                  <span className="flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-4xl font-light text-white/85">
                    +
                  </span>
                  <span className="mt-4 text-sm font-medium text-white/70">
                    点击或拖拽上传图片
                  </span>
                  <span className="mt-2 text-xs leading-5 text-white/35">
                    {uploadRequirement}
                  </span>
                </span>
              )}

              {isUploading ? (
                <span className="absolute inset-0 flex flex-col items-center justify-center bg-black/70">
                  <span className="h-9 w-9 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                  <span className="mt-3 text-xs text-white/70">正在上传</span>
                </span>
              ) : null}
            </span>
          </label>

          {previewUrl && !isUploading ? (
            <button
              type="button"
              onClick={onClearImage}
              className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-black/75 text-xl leading-none text-white transition hover:bg-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
              aria-label="清除参考图"
              title="清除参考图"
            >
              ×
            </button>
          ) : null}
        </div>
      </div>

      {uploadError ? (
        <div className="mt-3 rounded-[14px] border border-red-400/25 bg-red-500/10 px-3 py-2 text-sm leading-6 text-red-200">
          {uploadError}
        </div>
      ) : null}
    </section>
  );
}
