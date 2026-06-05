import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// `base` is set for GitHub Pages project-site deploys (https://<user>.github.io/drop-boardgame/).
// Override with BASE_PATH=/ for local file serving or a custom domain.
export default defineConfig({
  plugins: [react()],
  base: process.env.BASE_PATH ?? "/drop-boardgame/",
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
