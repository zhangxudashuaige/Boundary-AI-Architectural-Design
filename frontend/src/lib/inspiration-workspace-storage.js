import {
  INSPIRATION_WORKSPACE_STORAGE_KEY,
  INSPIRATION_WORKSPACE_STORAGE_VERSION
} from "@/config/inspiration-task";

function hasWindow() {
  return typeof window !== "undefined";
}

export function readInspirationWorkspaceSnapshot() {
  if (!hasWindow()) {
    return null;
  }

  try {
    const rawValue = window.localStorage.getItem(
      INSPIRATION_WORKSPACE_STORAGE_KEY
    );

    if (!rawValue) {
      return null;
    }

    const parsedValue = JSON.parse(rawValue);

    if (parsedValue?.version !== INSPIRATION_WORKSPACE_STORAGE_VERSION) {
      return null;
    }

    return parsedValue.data || null;
  } catch {
    return null;
  }
}

export function writeInspirationWorkspaceSnapshot(snapshot) {
  if (!hasWindow()) {
    return;
  }

  try {
    window.localStorage.setItem(
      INSPIRATION_WORKSPACE_STORAGE_KEY,
      JSON.stringify({
        version: INSPIRATION_WORKSPACE_STORAGE_VERSION,
        data: snapshot
      })
    );
  } catch {
    // Ignore storage write failures so UI flow is not blocked.
  }
}

export function clearInspirationWorkspaceSnapshot() {
  if (!hasWindow()) {
    return;
  }

  try {
    window.localStorage.removeItem(INSPIRATION_WORKSPACE_STORAGE_KEY);
  } catch {
    // Ignore storage delete failures.
  }
}
