import { configDefaults, defineConfig } from "vitest/config";
import { resolve } from "node:path";
import { resolveVitestCoverageDir } from "../scripts/report-output-paths.mjs";

const allTests = ["test/**/*.test.ts"];
const integrationTests = [
  "test/runtime/**/*.test.ts",
  "test/**/*.integration.test.ts",
  "test/app-side-runtime.test.ts",
  "test/page-shell-runtime.test.ts",
  "test/phone-preview-coverage.test.ts",
  "test/phone-store.test.ts",
  "test/settings-page-behavior.test.ts",
  "test/simulator-doctor.test.ts",
  "test/validation-log-report.test.ts",
  "test/version-workflow.test.ts",
  "test/watch-layouts-and-shortcut.test.ts",
  "test/watch-redesign.test.ts",
  "test/watch-runtime-helpers.test.ts",
  "test/watch-space-review.test.ts",
  "test/zeus-build-wrapper.test.ts"
];

export default defineConfig(({ mode }) => ({
  root: resolve(__dirname, ".."),
  test: {
    environment: "node",
    include: mode === "integration" ? integrationTests : allTests,
    exclude: mode === "unit" ? [...configDefaults.exclude, ...integrationTests] : configDefaults.exclude,
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      reportsDirectory: resolveVitestCoverageDir({
        suite: mode === "unit" || mode === "integration" ? mode : "combined"
      }),
      include: ["zepp-app/**/*.{js,jsx}", "scripts/*.mjs"],
      exclude: ["zepp-app/assets/**", "zepp-app/dist/**"]
    }
  },
  resolve: {
    alias: {
      "@zos/page": resolve(__dirname, "zeus-runtime/zos-page.ts"),
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
}));
