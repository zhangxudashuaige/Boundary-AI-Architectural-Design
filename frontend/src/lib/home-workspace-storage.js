import {
  HOME_WORKSPACE_STORAGE_KEY,
  HOME_WORKSPACE_STORAGE_VERSION
} from "@/config/render-task";

function hasWindow() {
  return typeof window !== "undefined";
}

export function readHomeWorkspaceSnapshot() {
  if (!hasWindow()) {
    return null;
  }

  try {
    const rawValue = window.localStorage.getItem(HOME_WORKSPACE_STORAGE_KEY);

    if (!rawValue) {
      return null;
    }

    const parsedValue = JSON.parse(rawValue);

    if (parsedValue?.version !== HOME_WORKSPACE_STORAGE_VERSION) {
      return null;
    }

    return parsedValue.data || null;
  } catch {
    return null;
  }
}

export function writeHomeWorkspaceSnapshot(snapshot) {
  if (!hasWindow()) {
    return;
  }

  try {
    window.localStorage.setItem(
      HOME_WORKSPACE_STORAGE_KEY,
      JSON.stringify({
        version: HOME_WORKSPACE_STORAGE_VERSION,
        data: snapshot
      })
    );
  } catch {
    // Ignore storage write failures so UI flow is not blocked.
  }
}

export function clearHomeWorkspaceSnapshot() {
  if (!hasWindow()) {
    return;
  }

  try {
    window.localStorage.removeItem(HOME_WORKSPACE_STORAGE_KEY);
  } catch {
    // Ignore storage delete failures.
  }
}
