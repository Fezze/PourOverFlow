import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  root: resolve(__dirname, ".."),
  test: {
    environment: "node",
    include: ["test/watch-preview-fixtures.preview.ts"],
    exclude: ["test/**/*.test.ts"]
  },
  resolve: {
    alias: {
      "@zos/ble": resolve(__dirname, "zeus-runtime/zos-ble.ts"),
      "@zos/device": resolve(__dirname, "zeus-runtime/zos-device.ts"),
      "@zos/display": resolve(__dirname, "zeus-runtime/zos-display.ts"),
      "@zos/interaction": resolve(__dirname, "zeus-runtime/zos-interaction.ts"),
      "@zos/router": resolve(__dirname, "zeus-runtime/zos-router.ts"),
      "@zos/settings": resolve(__dirname, "zeus-runtime/zos-settings.ts"),
      "@zos/sensor": resolve(__dirname, "zeus-runtime/zos-sensor.ts"),
      "@zos/storage": resolve(__dirname, "zeus-runtime/zos-storage.ts"),
      "@zos/ui": resolve(__dirname, "zeus-runtime/zos-ui.ts"),
      "@zos/utils": resolve(__dirname, "zeus-runtime/zos-utils.ts")
    }
  }
});