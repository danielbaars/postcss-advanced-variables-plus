import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    restoreMocks: true,
    coverage: {
      provider: "istanbul",
      reporter: ["text", "html", "lcov"],
      include: ["src/**"],
      exclude: ["**/*.test.{ts,tsx}", "**/*.d.ts"],
    },
  },
});
