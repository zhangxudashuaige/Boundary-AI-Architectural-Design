import { Panel } from "@/components/ui/panel";
import {
  ACCEPTED_UPLOAD_TYPES,
  MAX_UPLOAD_FILE_SIZE_LABEL
} from "@/config/upload";

const uploadTips = [
  "支持 JPG、JPEG、PNG、WEBP 图片",
  `文件大小上限 ${MAX_UPLOAD_FILE_SIZE_LABEL}`,
  "选择图片后会立即上传到后端并返回可访问地址"
];

function getUploadStatusCopy({ isUploading, uploadError, imageUrl, previewUrl }) {
  if (isUploading) {
    return "正在上传到服务端";
  }

  if (uploadError) {
    return "上传失败，请重新选择图片";
  }

  if (imageUrl) {
    return "图片已上传到服务端";
  }

  if (previewUrl) {
    return "图片已选择，等待上传结果";
  }

  return "尚未上传图片";
}

export function UploadPanel({
  previewUrl,
  imageName,
  imageMeta,
  imageUrl,
  fileUrl,
  filePath,
  uploadError,
  isUploading,
  onSelectImage,
  onClearImage
}) {
  const statusText = getUploadStatusCopy({
    isUploading,
    uploadError,
    imageUrl,
    previewUrl
  });

  return (
    <Panel className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-accent">Upload Panel</p>
          <h2 className="mt-3 text-2xl font-semibold text-white">上传参考图片</h2>
        </div>
        <span className="ui-chip">Step 01</span>
      </div>

      <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <label className="group flex min-h-[260px] cursor-pointer flex-col justify-between rounded-[30px] border border-dashed border-white/[0.15] bg-gradient-to-br from-black/10 via-white/[0.02] to-black/10 p-6 transition duration-200 hover:border-accent/60 hover:shadow-[0_18px_45px_rgba(214,185,140,0.08)]">
          <input
            type="file"
            accept={ACCEPTED_UPLOAD_TYPES}
            className="hidden"
            onChange={onSelectImage}
          />

          <div className="space-y-4">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-2xl text-accent transition group-hover:scale-105 group-hover:border-accent/30 group-hover:bg-accent/10">
              +
            </span>
            <div>
              <p className="text-lg font-semibold text-white">点击选择本地图片并立即上传</p>
              <p className="mt-2 max-w-sm text-sm leading-6 text-slate-400">
                建议上传建筑草图、参考图或方案图。上传成功后会保存后端返回的图片地址，后续可直接用于创建渲染任务。
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 rounded-2xl border border-white/[0.08] bg-slate-950/[0.45] px-4 py-3 text-sm text-slate-300">
            <span>推荐使用主体清晰、构图明确的建筑图片，便于后续提示词与渲染结果对齐。</span>
            <span className="ui-button-mini">{isUploading ? "上传中..." : "添加图片"}</span>
          </div>
        </label>

        <div className="rounded-[30px] border border-white/10 bg-slate-950/[0.45] p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Image Preview</p>
              <p className="mt-1 text-sm text-slate-300">{statusText}</p>
            </div>

            {previewUrl ? (
              <button
                type="button"
                onClick={onClearImage}
                className="ui-button-mini"
              >
                移除图片
              </button>
            ) : null}
          </div>

          <div className="mt-4 overflow-hidden rounded-[24px] border border-white/[0.08] bg-black/[0.15]">
            {previewUrl ? (
              <div className="space-y-4 p-4">
                <div className="overflow-hidden rounded-[20px] border border-white/10 bg-slate-900/80">
                  <img
                    src={previewUrl}
                    alt="上传预览"
                    className="aspect-[4/3] w-full object-cover"
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="ui-subtle-card px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-500">文件名称</p>
                    <p className="mt-2 truncate text-sm text-white">{imageName}</p>
                  </div>
                  <div className="ui-subtle-card px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.24em] text-slate-500">文件信息</p>
                    <p className="mt-2 text-sm text-white">{imageMeta}</p>
                  </div>
                  {imageUrl ? (
                    <div className="ui-subtle-card px-4 py-3 sm:col-span-2">
                      <p className="text-xs uppercase tracking-[0.24em] text-slate-500">
                        服务端图片地址
                      </p>
                      <p className="mt-2 break-all text-sm text-white">
                        {imageUrl || fileUrl}
                      </p>
                      {filePath ? (
                        <p className="mt-2 break-all text-xs text-slate-400">
                          文件路径：{filePath}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              </div>
            ) : (
              <div className="flex min-h-[338px] flex-col items-center justify-center bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.05),transparent_45%)] px-6 text-center">
                <div className="flex h-24 w-24 items-center justify-center rounded-full border border-white/10 bg-white/5 text-sm uppercase tracking-[0.28em] text-slate-500">
                  Preview
                </div>
                <p className="mt-5 text-lg font-semibold text-white">等待图片上传</p>
                <p className="mt-2 max-w-sm text-sm leading-6 text-slate-400">
                  选择图片后会先完成本地校验，再调用后端上传接口。上传成功后，这里会展示预览与服务端返回的图片地址。
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {isUploading ? (
        <div className="rounded-2xl border border-amber-300/20 bg-amber-300/10 px-4 py-3 text-sm text-amber-100">
          正在将图片上传到后端，请稍候。上传完成后才能开始渲染。
        </div>
      ) : null}

      {uploadError ? (
        <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
          {uploadError}
        </div>
      ) : null}

      {!isUploading && imageUrl ? (
        <div className="rounded-2xl border border-emerald/20 bg-emerald/10 px-4 py-3 text-sm text-emerald-100">
          图片上传成功，已保存后端返回的图片地址。现在可以继续填写描述并开始渲染。
        </div>
      ) : null}

      <ul className="grid gap-3 text-sm text-slate-300">
        {uploadTips.map((tip) => (
          <li key={tip} className="ui-subtle-card px-4 py-3">
            {tip}
          </li>
        ))}
      </ul>
    </Panel>
  );
}
