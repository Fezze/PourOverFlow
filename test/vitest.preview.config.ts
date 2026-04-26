import { defineConfig, mergeConfig } from "vitest/config";

import baseConfig from "./vitest.config.ts";

export default mergeConfig(baseConfig, defineConfig({
  test: {
    include: ["test/watch-preview-fixtures.preview.ts"]
  }
}));