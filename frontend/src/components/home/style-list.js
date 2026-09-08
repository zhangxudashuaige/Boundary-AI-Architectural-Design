"use client";

import Image from "next/image";
import { useState } from "react";

const styles = [
  {
    id: "modern",
    label: "现代极简",
    image: "/picture/render-preview-reference.png"
  },
  {
    id: "future",
    label: "未来科技",
    image: "/picture/model-divergence-reference.jpeg"
  },
  {
    id: "nature",
    label: "自然生态",
    image: "/picture/workflow-overview.jpg"
  },
  {
    id: "industrial",
    label: "工业风",
    image: "/picture/thermal-performance-reference.png"
  },
  {
    id: "japanese",
    label: "日式留白",
    image: "/picture/plan-inspiration-reference.png"
  },
  {
    id: "classic",
    label: "新古典",
    image: "/picture/render-preview-reference.png"
  },
  {
    id: "mediterranean",
    label: "地中海",
    image: "/picture/workflow-overview-v2.png"
  },
  {
    id: "oriental",
    label: "中式雅韵",
    image: "/picture/plan-inspiration-reference.png"
  }
];

export function StyleList() {
  const [selectedStyle, setSelectedStyle] = useState(styles[0].id);

  return (
    <aside className="rounded-[24px] border border-white/10 bg-[#111111] p-4 lg:min-h-[calc(100vh-2rem)]">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase text-white/45">Style</p>
          <h2 className="mt-1 text-xl font-semibold text-white">风格列表</h2>
        </div>
        <span className="text-xs text-white/40">{styles.length}</span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-1">
        {styles.map((style) => {
          const isSelected = selectedStyle === style.id;

          return (
            <button
              key={style.id}
              type="button"
              aria-pressed={isSelected}
              onClick={() => setSelectedStyle(style.id)}
              className={`flex min-w-0 items-center gap-3 rounded-[14px] border p-2 text-left transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/70 ${
                isSelected
                  ? "border-violet-400 bg-violet-500/10"
                  : "border-white/10 bg-white/[0.025] hover:border-white/20 hover:bg-white/[0.05]"
              }`}
            >
              <span className="relative block h-14 w-20 shrink-0 overflow-hidden rounded-[9px] bg-[#080808]">
                <Image
                  src={style.image}
                  alt=""
                  fill
                  sizes="80px"
                  className="object-cover"
                />
              </span>
              <span className="min-w-0 text-sm font-medium text-white/90">
                {style.label}
              </span>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
