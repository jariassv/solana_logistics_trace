import path from "path";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
    plugins: [react()],
    test: {
        environment: "jsdom",
        setupFiles: ["./vitest.setup.ts"],
        coverage: {
            provider: "v8",
            reporter: ["text", "text-summary", "html", "lcov"],
            reportsDirectory: "./coverage",
            include: ["src/**/*.{ts,tsx}"],
            exclude: [
                "src/**/*.test.{ts,tsx}",
                "src/**/*.d.ts",
                "src/app/**/layout.tsx",
                "src/app/**/page.tsx",
            ],
            thresholds: {
                "src/lib/admin/**": {
                    lines: 40,
                    functions: 40,
                    branches: 40,
                    statements: 40,
                },
            },
        },
    },
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src"),
        },
    },
});
