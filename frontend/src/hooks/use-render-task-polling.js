"use client";

import { useEffect, useRef, useState } from "react";
import { RENDER_TASK_POLL_INTERVAL_MS } from "@/config/render-task";
import { getRenderTask } from "@/lib/get-render-task";

const DEFAULT_POLL_ERROR =
  "\u72b6\u6001\u67e5\u8be2\u5931\u8d25\uff0c\u6b63\u5728\u51c6\u5907\u4e0b\u4e00\u6b21\u91cd\u8bd5\u3002";

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
        const nextPollError = error.message || DEFAULT_POLL_ERROR;

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
