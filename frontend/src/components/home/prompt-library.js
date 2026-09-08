"use client";

import { useEffect, useMemo, useState } from "react";
import { promptLibrary } from "@/config/prompt-library";

function SearchIcon() {
  return (
    <span aria-hidden="true" className="text-base text-white/35">
      ⌕
    </span>
  );
}

export function PromptLibrary({ isOpen, onClose, onSelectPrompt }) {
  const [activeCategoryId, setActiveCategoryId] = useState(promptLibrary[0].id);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  const activeCategory =
    promptLibrary.find((category) => category.id === activeCategoryId) ||
    promptLibrary[0];

  const searchResults = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("zh-CN");

    if (!normalizedQuery) {
      return [];
    }

    return promptLibrary.flatMap((category) =>
      category.prompts
        .filter((prompt) =>
          `${category.name} ${prompt.title} ${prompt.content}`
            .toLocaleLowerCase("zh-CN")
            .includes(normalizedQuery)
        )
        .map((prompt) => ({ ...prompt, categoryName: category.name }))
    );
  }, [query]);

  if (!isOpen) {
    return null;
  }

  const isSearching = Boolean(query.trim());
  const visiblePrompts = isSearching ? searchResults : activeCategory.prompts;

  function handleUsePrompt(content) {
    onSelectPrompt(content);
    setQuery("");
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-3 sm:p-5"
      onMouseDown={onClose}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="prompt-library-title"
        className="flex max-h-[calc(100vh-1.5rem)] w-full max-w-[920px] flex-col overflow-hidden rounded-[22px] border border-white/15 bg-[#141414] shadow-[0_28px_80px_rgba(0,0,0,0.55)] sm:max-h-[calc(100vh-2.5rem)]"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="border-b border-white/10 p-4 sm:p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[11px] uppercase text-white/40">Prompts</p>
              <h2
                id="prompt-library-title"
                className="mt-1 text-xl font-semibold text-white"
              >
                提示词库
              </h2>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="关闭提示词库"
              title="关闭"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-2xl font-light leading-none text-white/70 transition hover:bg-white/[0.09] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60"
            >
              ×
            </button>
          </div>

          <label className="mt-4 flex h-11 items-center gap-2 rounded-[13px] border border-white/10 bg-black/25 px-3 focus-within:border-violet-400/45 focus-within:ring-2 focus-within:ring-violet-400/10">
            <SearchIcon />
            <span className="sr-only">搜索提示词</span>
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜索提示词"
              autoFocus
              className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/30"
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="rounded-full px-2 py-1 text-xs text-white/40 transition hover:text-white/75"
              >
                清除
              </button>
            ) : null}
          </label>
        </header>

        <div className="grid min-h-0 flex-1 md:grid-cols-[190px_minmax(0,1fr)]">
          <nav
            aria-label="提示词分类"
            className="flex gap-2 overflow-x-auto border-b border-white/10 p-3 md:block md:overflow-y-auto md:border-b-0 md:border-r md:p-4"
          >
            {promptLibrary.map((category) => {
              const isActive = !isSearching && category.id === activeCategoryId;

              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => {
                    setActiveCategoryId(category.id);
                    setQuery("");
                  }}
                  className={`shrink-0 rounded-[11px] px-3 py-2.5 text-left text-sm transition md:mb-1 md:w-full ${
                    isActive
                      ? "bg-violet-500/15 text-violet-200"
                      : "text-white/55 hover:bg-white/[0.05] hover:text-white/85"
                  }`}
                >
                  <span className="flex items-center justify-between gap-3">
                    <span>{category.name}</span>
                    <span className="text-[11px] text-white/25">
                      {category.prompts.length}
                    </span>
                  </span>
                </button>
              );
            })}
          </nav>

          <div className="min-h-0 overflow-y-auto p-4 sm:p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-base font-semibold text-white">
                  {isSearching ? "搜索结果" : activeCategory.name}
                </p>
                <p className="mt-1 text-xs text-white/35">
                  {visiblePrompts.length} 条提示词
                </p>
              </div>
            </div>

            {visiblePrompts.length ? (
              <div className="mt-4 grid gap-3 lg:grid-cols-2">
                {visiblePrompts.map((prompt) => (
                  <article
                    key={`${prompt.categoryName || activeCategory.name}-${prompt.id}`}
                    className="flex min-h-[190px] flex-col rounded-[16px] border border-white/10 bg-white/[0.025] p-4 transition hover:border-white/20 hover:bg-white/[0.045]"
                  >
                    {isSearching ? (
                      <p className="text-[11px] text-violet-300/70">
                        {prompt.categoryName}
                      </p>
                    ) : null}
                    <h3 className="mt-1 text-base font-medium text-white/90">
                      {prompt.title}
                    </h3>
                    <p className="mt-3 line-clamp-4 text-xs leading-6 text-white/45">
                      {prompt.content}
                    </p>
                    <div className="mt-auto flex justify-end pt-4">
                      <button
                        type="button"
                        onClick={() => handleUsePrompt(prompt.content)}
                        className="rounded-[11px] border border-violet-400/30 bg-violet-500/10 px-4 py-2 text-xs font-medium text-violet-200 transition hover:border-violet-300/55 hover:bg-violet-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/60"
                      >
                        使用
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="flex min-h-[320px] flex-col items-center justify-center rounded-[16px] border border-dashed border-white/10 px-6 text-center">
                <p className="text-sm font-medium text-white/65">没有找到提示词</p>
                <p className="mt-2 text-xs text-white/30">尝试搜索建筑类型、材质或氛围</p>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
