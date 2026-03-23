"use client";

import { useEffect, useState } from "react";
import { HistoryCard } from "@/components/history/history-card";
import { readHomeWorkspaceSnapshot } from "@/lib/home-workspace-storage";

function formatSyncTime() {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date());
}

function hasHistoryContent(snapshot) {
  if (!snapshot) {
    return false;
  }

  return Boolean(
    snapshot.resultUrl ||
      snapshot.imageUrl ||
      snapshot.fileUrl ||
      snapshot.rawPrompt ||
      snapshot.prompt ||
      snapshot.refinedPrompt
  );
}

function getSnapshotStatusMeta(snapshot) {
  if (snapshot?.status === "success") {
    return { label: "渲染成功", variant: "emerald" };
  }

  if (snapshot?.status === "generating") {
    return { label: "渲染中", variant: "amber" };
  }

  if (snapshot?.status === "error") {
    return { label: "渲染失败", variant: "rose" };
  }

  if (snapshot?.status === "ready") {
    return { label: "待开始", variant: "default" };
  }

  return { label: "未完成", variant: "default" };
}

function resolveCurrentImage(snapshot) {
  return snapshot?.resultUrl || snapshot?.imageUrl || snapshot?.fileUrl || "";
}

export function CurrentSessionHistory() {
  const [snapshot, setSnapshot] = useState(null);
  const [syncedAt, setSyncedAt] = useState("");

  useEffect(() => {
    const syncSnapshot = () => {
      setSnapshot(readHomeWorkspaceSnapshot());
      setSyncedAt(formatSyncTime());
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        syncSnapshot();
      }
    };

    syncSnapshot();
    window.addEventListener("focus", syncSnapshot);
    window.addEventListener("storage", syncSnapshot);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("focus", syncSnapshot);
      window.removeEventListener("storage", syncSnapshot);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  if (!hasHistoryContent(snapshot)) {
    return (
      <div className="ui-gallery-card rounded-[28px] p-6">
        <h3 className="text-2xl font-semibold text-slate-950">暂无历史记录</h3>
      </div>
    );
  }

  const rawPrompt = snapshot?.rawPrompt || snapshot?.prompt || "";
  const refinedPrompt = snapshot?.refinedPrompt || "";
  const statusMeta = getSnapshotStatusMeta(snapshot);

  return (
    <HistoryCard
      title={snapshot?.imageName || "当前工作区"}
      status={statusMeta.label}
      time={syncedAt || formatSyncTime()}
      category="当前记录"
      variant={statusMeta.variant}
      imageUrl={resolveCurrentImage(snapshot)}
      rawPrompt={rawPrompt}
      refinedPrompt={refinedPrompt}
    />
  );
}
