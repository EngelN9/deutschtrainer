import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  // The bundle is published inside the learner web app's static site at /classroom-app/, not at a
  // root. A relative base keeps `vite dev` serving at / while making the built asset URLs resolve
  // from any subdirectory, so the local workflow and the deployed one stay the same build.
  base: "./",
  build: {
    // Sourcemaps take the dist from 8 MB to 30 MB, and it is now uploaded on every deploy of the
    // learner web service. Build them locally when a production stack trace actually needs them.
    sourcemap: false,
    target: "es2022",
  },
  plugins: [react()],
});
