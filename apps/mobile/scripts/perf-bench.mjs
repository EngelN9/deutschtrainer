// Android on-device frame/CPU benchmark. Needs adb + a connected device with the app installed.
//
// Usage: node scripts/perf-bench.mjs            (runs the full suite, prints a table)
//
// ponytail: black-box only -- attributes cost to thread + render stage, not to a JS call site.
// Pinning a cost inside one React render needs a JS-instrumented build; this tells you whether
// you need one. Numbers are device-specific: always compare a before/after pair from one session.
import { execFileSync } from "node:child_process";

const PKG = "com.deutschtrainer.app";
const sh = (...a) => execFileSync("adb", ["shell", ...a], { encoding: "utf8", maxBuffer: 1 << 26 });
const pid = () => sh("pidof", PKG).trim();
const sleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

// Cumulative on-CPU nanoseconds per thread. schedstat field 1, summed over same-named threads.
function threads(p) {
  const out = sh(`for t in /proc/${p}/task/*; do echo "$(cat $t/comm) $(cat $t/schedstat)"; done`);
  const acc = {};
  for (const line of out.split("\n")) {
    const f = line.trim().split(/\s+/);
    if (f.length >= 4 && /^\d+$/.test(f.at(-3))) {
      const name = f.slice(0, -3).join(" ");
      acc[name] = (acc[name] ?? 0) + Number(f.at(-3));
    }
  }
  return acc;
}

const COLS = [
  ["vsyncWait", "IntendedVsync", "FrameStartTime"],
  ["layout", "PerformTraversalsStart", "DrawStart"],
  ["draw", "DrawStart", "SyncQueued"],
  ["issue", "IssueDrawCommandsStart", "SwapBuffers"],
  ["gpu", "SwapBuffers", "GpuCompleted"],
];

function framestats() {
  const txt = sh("dumpsys", "gfxinfo", PKG, "framestats");
  const rows = [];
  let cols = null;
  for (const raw of txt.split("\n")) {
    const line = raw.trim().replace(/,$/, "");
    if (line.startsWith("Flags,")) {
      cols = line.split(",");
      continue;
    }
    if (!cols || !/^\d/.test(line)) continue;
    const p = line.split(",");
    if (p.length < cols.length) continue;
    const r = Object.fromEntries(cols.map((c, i) => [c, Number(p[i])]));
    // AOSP prints these two header names in the opposite order to the data it emits.
    if (r.FrameInterval > r.FrameStartTime) {
      [r.FrameInterval, r.FrameStartTime] = [r.FrameStartTime, r.FrameInterval];
    }
    rows.push(r);
  }
  return rows;
}

const pctl = (xs, q) => {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor(q * s.length))];
};
const ms = (ns) => ns / 1e6;

export function frameReport(rows, label) {
  if (!rows.length) return console.log(`${label}: no frames`);
  rows.sort((a, b) => a.IntendedVsync - b.IntendedVsync);
  const total = rows.map((r) => ms(r.FrameCompleted - r.IntendedVsync));
  // A stalled JS thread drops frames rather than slowing them, so gfxinfo's own jank% cannot
  // see it. Gaps between presented frames are the only signal for it here.
  const gaps = rows
    .slice(1)
    .map((r, i) => ms(r.IntendedVsync - rows[i].FrameCompleted))
    .filter((g) => g > 33);
  console.log(`\n### ${label}  frames=${rows.length}`);
  console.log(
    `  total ms  p50=${pctl(total, 0.5).toFixed(1)}  p90=${pctl(total, 0.9).toFixed(1)}  max=${Math.max(...total).toFixed(1)}`,
  );
  console.log(
    "  " +
      COLS.map(
        ([n, a, b]) =>
          `${n}=${pctl(
            rows.map((r) => ms(r[b] - r[a])),
            0.5,
          ).toFixed(2)}`,
      ).join("  "),
  );
  console.log(
    `  stalls>33ms: ${gaps.length}  worst=${gaps.length ? Math.max(...gaps).toFixed(0) + "ms" : "-"}`,
  );
}

export function cpuReport(before, after, label, n = 1) {
  const rows = [...new Set([...Object.keys(before), ...Object.keys(after)])]
    .map((k) => [ms((after[k] ?? 0) - (before[k] ?? 0)) / n, k])
    .filter(([v]) => v > 0.5)
    .sort((a, b) => b[0] - a[0]);
  console.log(
    `  CPU ms${n > 1 ? "/interaction" : ""}: ` +
      rows
        .slice(0, 4)
        .map(([v, k]) => `${k}=${v.toFixed(1)}`)
        .join("  "),
  );
}

export const bench = {
  PKG,
  sh,
  pid,
  threads,
  framestats,
  frameReport,
  cpuReport,
  sleep,
  reset: () => sh("dumpsys", "gfxinfo", PKG, "reset"),
};

if (process.argv[1] && process.argv[1].endsWith("perf-bench.mjs")) {
  const p = pid();
  if (!p) {
    console.error(`${PKG} is not running`);
    process.exit(1);
  }
  // Idle baseline: the app should cost ~nothing when nothing is happening.
  const a = threads(p);
  sleep(4000);
  const b = threads(p);
  console.log("### idle 4s, foreground, untouched");
  cpuReport(a, b, "idle", 4);
  console.log(
    "  (per second -- RN's Fabric DispatchUIFrameCallback runs every vsync while resumed)",
  );
}
