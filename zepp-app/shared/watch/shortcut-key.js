import { onKey, KEY_SHORTCUT, KEY_EVENT_CLICK } from "@zos/interaction";

const SHORTCUT_DEBOUNCE_MS = 250;

export function registerShortcutKey(handler) {
  let lastHandledAt = 0;

  try {
    onKey({
      callback: (key, event) => {
        if (key !== KEY_SHORTCUT) {
          return false;
        }

        if (event !== KEY_EVENT_CLICK) {
          return true;
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
