import path from "node:path";
import { defineConfig } from "vitest/config";

const alias = {
  "@": path.resolve(__dirname, "./src"),
};

export default defineConfig({
  resolve: { alias },
  test: {
    setupFiles: ["./src/vitest-setup.ts"],
    projects: [
      {
        test: {
          name: "node",
          environment: "node",
          include: ["src/**/*.test.ts"],
          exclude: ["**/node_modules/**"],
        },
        resolve: { alias },
      },
      {
        test: {
          name: "jsdom",
          environment: "jsdom",
          include: ["src/**/*.test.tsx"],
          exclude: ["**/node_modules/**"],
        },
        resolve: { alias },
      },
    ],
  },
});
