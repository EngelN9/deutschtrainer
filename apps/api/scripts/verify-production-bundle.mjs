import { spawn } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

const host = "127.0.0.1";
const port = 18787;
const healthUrl = `http://${host}:${port}/health`;
const output = [];
const server = spawn(process.execPath, ["dist/server.mjs"], {
  cwd: process.cwd(),
  env: {
    ...process.env,
    NODE_ENV: "production",
    APP_ENV: "staging",
    HOST: host,
    PORT: String(port),
    SUPABASE_URL: "https://example.supabase.co",
    SUPABASE_SERVICE_ROLE_KEY: "bundle-smoke-service-key",
    OPENAI_API_KEY: "",
    AI_EVALUATION_FAKE_MODE: "false",
  },
  stdio: ["ignore", "pipe", "pipe"],
});

server.stdout.on("data", (chunk) => output.push(chunk.toString()));
server.stderr.on("data", (chunk) => output.push(chunk.toString()));

try {
  const payload = await waitForHealth();
  if (
    payload.status !== "ok" ||
    payload.service !== "deutschtrainer-api" ||
    payload.aiConfigured !== false
  ) {
    throw new Error(`Unexpected health payload: ${JSON.stringify(payload)}`);
  }
  console.log(`Production bundle health check passed at ${healthUrl}.`);
} finally {
  await stopServer();
}

async function waitForHealth() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    if (server.exitCode !== null) {
      throw new Error(`Production bundle exited early (${server.exitCode}).\n${output.join("")}`);
    }

    try {
      const response = await fetch(healthUrl);
      if (response.ok) {
        return await response.json();
      }
    } catch {
      // The bundle may still be starting.
    }
    await delay(250);
  }
  throw new Error(`Production bundle did not become healthy.\n${output.join("")}`);
}

async function stopServer() {
  if (server.exitCode !== null) {
    if (server.exitCode !== 0) {
      throw new Error(`Production bundle exited with ${server.exitCode}.\n${output.join("")}`);
    }
    return;
  }
  const exitPromise = new Promise((resolve) => {
    server.once("exit", (code, signal) => resolve({ exited: true, code, signal }));
  });
  if (!server.kill("SIGTERM")) {
    throw new Error("Production bundle did not accept the stop signal.");
  }
  const result = await Promise.race([
    exitPromise,
    delay(5_000).then(() => ({ exited: false, code: null, signal: null })),
  ]);
  if (!result.exited) {
    server.kill("SIGKILL");
    throw new Error(`Production bundle did not stop gracefully.\n${output.join("")}`);
  }
  const windowsSignalExit = process.platform === "win32" && result.signal === "SIGTERM";
  if (result.code !== 0 && !windowsSignalExit) {
    throw new Error(
      `Production bundle exited with ${result.code ?? result.signal}.\n${output.join("")}`,
    );
  }
}
