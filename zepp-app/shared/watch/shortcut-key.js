import { onKey, KEY_SHORTCUT } from "@zos/interaction";

const SHORTCUT_DEBOUNCE_MS = 250;

export function registerShortcutKey(handler) {
  let lastHandledAt = 0;

  try {
    onKey({
      callback: (key) => {
        if (key !== KEY_SHORTCUT) {
          return false;
        }

        const now = Date.now();
        if (now - lastHandledAt < SHORTCUT_DEBOUNCE_MS) {
          return true;
        }

        lastHandledAt = now;
        handler();
        return true;
      }
    });
    return true;
  } catch (error) {
    console.log("Shortcut key registration skipped", error);
    return false;
  }
}
