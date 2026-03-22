"use client";

import { useEffect, useRef, useState } from "react";
import { RENDER_TASK_POLL_INTERVAL_MS } from "@/config/render-task";
import { getRenderTask } from "@/lib/get-render-task";

export function useRenderTaskPolling({
  taskId,
  enabled,
  intervalMs = RENDER_TASK_POLL_INTERVAL_MS,
  onTaskUpdate,
  onTaskCompleted,
  onTaskFailed,
  onPollError
}) {
  const [isPolling, setIsPolling] = useState(false);
  const [pollError, setPollError] = useState("");

  const timeoutRef = useRef(null);
  const requestAbortRef = useRef(null);
  const handlersRef = useRef({
    onTaskUpdate,
    onTaskCompleted,
    onTaskFailed,
    onPollError
  });

  useEffect(() => {
    handlersRef.current = {
      onTaskUpdate,
      onTaskCompleted,
      onTaskFailed,
      onPollError
    };
  }, [onTaskUpdate, onTaskCompleted, onTaskFailed, onPollError]);

  function clearPendingWork() {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    if (requestAbortRef.current) {
      requestAbortRef.current.abort();
      requestAbortRef.current = null;
    }
  }

  useEffect(() => {
    if (!enabled || !taskId) {
      clearPendingWork();
      setIsPolling(false);
      setPollError("");
      return;
    }

    let disposed = false;

    setIsPolling(true);
    setPollError("");

    async function pollOnce() {
      if (disposed) {
        return;
      }

      const controller = new AbortController();
      requestAbortRef.current = controller;

      try {
        const task = await getRenderTask(taskId, controller.signal);

        if (disposed) {
          return;
        }

        requestAbortRef.current = null;
        setPollError("");
        handlersRef.current.onTaskUpdate?.(task);

        if (task.status === "completed") {
          setIsPolling(false);
          handlersRef.current.onTaskCompleted?.(task);
          return;
        }

        if (task.status === "failed") {
          setIsPolling(false);
          handlersRef.current.onTaskFailed?.(task);
          return;
        }

        timeoutRef.current = window.setTimeout(pollOnce, intervalMs);
      } catch (error) {
        if (disposed || error?.name === "AbortError") {
          return;
        }

        requestAbortRef.current = null;
        const nextPollError =
          error.message || "状态查询失败，正在准备下一次重试。";

        setPollError(nextPollError);
        handlersRef.current.onPollError?.(error);

        if (error.status === 400 || error.status === 404) {
          setIsPolling(false);
          return;
        }

        timeoutRef.current = window.setTimeout(pollOnce, intervalMs);
      }
    }

    void pollOnce();

    return () => {
      disposed = true;
      clearPendingWork();
    };
  }, [enabled, intervalMs, taskId]);

  return {
    isPolling,
    pollError
  };
}
