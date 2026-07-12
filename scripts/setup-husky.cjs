const { existsSync } = require("node:fs");
const { execFileSync } = require("node:child_process");

if (!existsSync(".git")) {
  console.log("Skipping Husky setup because this workspace is not a Git repository yet.");
  process.exit(0);
}

if (process.env.npm_execpath) {
  execFileSync(process.execPath, [process.env.npm_execpath, "exec", "husky"], {
    stdio: "inherit",
  });
} else {
  execFileSync(process.platform === "win32" ? "pnpm.cmd" : "pnpm", ["exec", "husky"], {
    stdio: "inherit",
  });
}
