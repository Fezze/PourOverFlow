#!/usr/bin/env sh

# Forward Playwright's remote-debugging pipe file descriptors into host Chromium
# when Codex or VS Code is running inside a Flatpak sandbox on Steam Deck/Linux.
exec /usr/bin/flatpak-spawn --host --forward-fd=3 --forward-fd=4 /var/lib/flatpak/exports/bin/org.chromium.Chromium "$@"
