import { Panel } from "@/components/ui/panel";
import {
  ACCEPTED_UPLOAD_TYPES,
  MAX_UPLOAD_FILE_SIZE_LABEL
} from "@/config/upload";

const uploadRequirement = `JPG / JPEG / PNG / WEBP，小于 ${MAX_UPLOAD_FILE_SIZE_LABEL}`;

function getUploadState({ isUploading, uploadError, imageUrl, previewUrl }) {
  if (isUploading) {
    return {
      label: "上传中",
      badgeClass:
        "inline-flex items-center rounded-full border border-black/12 bg-[#fafaf6] px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-slate-900"
    };
  }

  if (uploadError) {
    return {
      label: "上传失败",
      badgeClass:
        "inline-flex items-center rounded-full border border-black/12 bg-[#fafaf6] px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-slate-900"
    };
  }

  if (imageUrl) {
    return {
      label: "已上传",
      badgeClass:
        "inline-flex items-center rounded-full border border-black/12 bg-[#fafaf6] px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-slate-900"
    };
  }

  if (previewUrl) {
    return {
      label: "已选择",
      badgeClass:
        "inline-flex items-center rounded-full border border-black/12 bg-[#fafaf6] px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-slate-800"
    };
  }

  return {
    label: "待上传",
    badgeClass:
      "inline-flex items-center rounded-full border border-black/10 bg-white px-3 py-1.5 text-[11px] uppercase tracking-[0.18em] text-slate-700"
  };
}

export function UploadPanel({
  previewUrl,
  imageUrl,
  uploadError,
  isUploading,
  onSelectImage,
  onClearImage
}) {
  const uploadState = getUploadState({
    isUploading,
    uploadError,
    imageUrl,
    previewUrl
  });

  return (
    <Panel className="space-y-4 overflow-hidden">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-2xl font-semibold text-slate-950">AI 图片</p>
        </div>
        <span className={uploadState.badgeClass}>{uploadState.label}</span>
      </div>

      <div className="rounded-[24px] border border-black/10 bg-[#fcfcf8] p-3">
        <label className="block cursor-pointer">
          <input
            type="file"
            accept={ACCEPTED_UPLOAD_TYPES}
            className="hidden"
            onChange={onSelectImage}
          />

          <div className="ui-dropzone relative min-h-[220px] overflow-hidden rounded-[20px] p-0">
            {previewUrl ? (
              <>
                <img
                  src={previewUrl}
                  alt="参考图预览"
                  className="absolute inset-0 h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-white/18" />
              </>
            ) : null}

            {previewUrl ? (
              <button
                type="button"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  onClearImage();
                }}
                className="absolute right-3 top-3 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full border border-black/10 bg-white/92 text-lg text-slate-900 backdrop-blur-xl transition hover:bg-[#f5f5f0]"
                aria-label="清除参考图"
              >
                ×
              </button>
            ) : null}

            <div className="relative z-[1] flex min-h-[220px] flex-col items-center justify-center px-6 py-8 text-center">
              {!previewUrl ? (
                <>
                  <div className="flex h-20 w-20 items-center justify-center rounded-[24px] border border-black/10 bg-white text-5xl text-slate-950">
                    +
                  </div>
                  <p className="mt-5 text-base font-semibold text-slate-950">
                    点击 / 拖拽 / 粘贴上传参考图
                  </p>
                  <p className="mt-2 text-sm text-slate-500">{uploadRequirement}</p>
                </>
              ) : null}

              {isUploading ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/76 backdrop-blur-[2px]">
                  <div className="h-10 w-10 animate-spin rounded-full border-2 border-black/15 border-t-black/85" />
                  <p className="mt-4 text-xs uppercase tracking-[0.24em] text-slate-900">
                    上传中
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        </label>
      </div>

      {uploadError ? (
        <div className="ui-alert border-black/12 bg-[#fafaf6] text-slate-900">
          {uploadError}
        </div>
      ) : null}
    </Panel>
  );
}
