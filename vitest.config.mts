import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src") } },
  test: {
    environment: "jsdom",
    setupFiles: ["src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["src/**/*.integration.test.ts"],
    testTimeout: 15_000,
    coverage: { provider: "v8", include: ["src/lib/**/*.ts", "src/app/api/**/*.ts"] },
  },
});
