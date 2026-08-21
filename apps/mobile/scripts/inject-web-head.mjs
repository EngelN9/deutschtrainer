// Injects document-head metadata into the exported web app.
//
// ponytail: post-processes Expo's emitted index.html because the framework hook for this
// (app/+html.tsx) only runs under `web.output: "static"`, and static rendering prerenders every
// route in Node — where the Supabase client calls AsyncStorage.getItem during __loadSession and
// the export dies. Upgrade path: make apps/mobile/src/lib/supabase.ts safe to import without a
// browser (lazy client or a no-op server storage adapter), switch web.output to "static", move
// this content into app/+html.tsx, and delete this script.
//
// Runs as part of `export:web`, so any deployment building through that script gets it.

import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const indexPath = path.join(projectRoot, "dist", "index.html");

const DESCRIPTION =
  "以繁體中文文法解釋、錯誤診斷、間隔複習與輸出訓練，建立 B1 到 C2 的德語學習路徑。";
const TITLE = "DeutschTrainer 德語 B1-C2 自學系統";
const THEME_COLOR = "#2563EB";
const MARKER = "data-dt-head";

const HEAD_TAGS = `
    <meta ${MARKER} name="description" content="${DESCRIPTION}" />
    <meta ${MARKER} name="theme-color" content="${THEME_COLOR}" />
    <meta ${MARKER} property="og:type" content="website" />
    <meta ${MARKER} property="og:site_name" content="DeutschTrainer" />
    <meta ${MARKER} property="og:title" content="${TITLE}" />
    <meta ${MARKER} property="og:description" content="${DESCRIPTION}" />
    <meta ${MARKER} property="og:locale" content="zh_TW" />
    <meta ${MARKER} property="og:image" content="/icon-512.png" />
    <meta ${MARKER} name="twitter:card" content="summary" />
    <link ${MARKER} rel="manifest" href="/manifest.json" />
    <link ${MARKER} rel="apple-touch-icon" href="/apple-touch-icon.png" />
    <meta ${MARKER} name="apple-mobile-web-app-capable" content="yes" />
    <meta ${MARKER} name="apple-mobile-web-app-status-bar-style" content="default" />
    <meta ${MARKER} name="apple-mobile-web-app-title" content="DeutschTrainer" />
    <meta ${MARKER} name="mobile-web-app-capable" content="yes" />
`;

const html = await readFile(indexPath, "utf8");

if (html.includes(MARKER)) {
  console.log("inject-web-head: already injected, nothing to do.");
  process.exit(0);
}

if (!html.includes("</head>")) {
  throw new Error(
    `inject-web-head: no </head> found in ${indexPath}; Expo's output shape changed.`,
  );
}

// The app is Traditional Chinese; Expo hardcodes lang="en".
let next = html.replace('<html lang="en">', '<html lang="zh-Hant">');

if (next === html) {
  throw new Error(
    `inject-web-head: expected <html lang="en"> in ${indexPath}; Expo's output shape changed.`,
  );
}

// viewport-fit=cover keeps content clear of the notch when installed to an iOS home screen.
next = next.replace(
  '<meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />',
  '<meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover" />',
);

next = next.replace("</head>", `${HEAD_TAGS}  </head>`);

await writeFile(indexPath, next, "utf8");
console.log(`inject-web-head: updated ${path.relative(projectRoot, indexPath)}`);
