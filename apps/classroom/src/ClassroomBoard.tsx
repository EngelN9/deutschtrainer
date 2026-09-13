import { convertToExcalidrawElements, Excalidraw, restoreElements } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ClassroomBoardState } from "./boardReducer";

// Wide enough for a normal German sentence at fontSize 30, narrow enough that a long one wraps
// instead of running off into empty canvas.
const TEXT_WIDTH = 900;

// Excalidraw's own font string for a text element: the hand-drawn face first, then the CJK face,
// then emoji. Chinese never renders in Excalifont - it falls through to Xiaolai - so awaiting only
// the German face would still leave the zh-TW gloss measured against a fallback.
const boardFontString = (fontSize: number): string =>
  `${fontSize}px Excalifont, Xiaolai, Segoe UI Emoji`;

export function ClassroomBoard({
  state,
  onSendBoardText,
}: {
  onSendBoardText?: (text: string) => boolean;
  state: ClassroomBoardState;
}) {
  // Excalidraw bakes a text element's width in at convertToExcalidrawElements time by measuring the
  // string, then paints it into a canvas sized from that width - so a box measured against the
  // wrong font clips the tail of every sentence.
  //
  // document.fonts.ready cannot be the trigger, which is why two earlier attempts failed. Excalidraw
  // does not declare its canvas fonts with CSS @font-face; it constructs FontFace objects in JS
  // *after* mount, and its own scene-font load runs once against a still-empty scene. So at effect
  // time nothing is pending and `ready` resolves instantly against the fallback metrics.
  //
  // Ask for the exact faces instead, passing the text so the right CJK subset is fetched, and also
  // listen for loadingdone - Excalifont is not bundled and is fetched from a CDN at runtime, so it
  // can land arbitrarily late. Re-running convertToExcalidrawElements re-measures from scratch.
  const [fontsToken, setFontsToken] = useState(0);
  const boardText = useMemo(() => textOnBoard(state), [state]);

  useEffect(() => {
    let active = true;
    const bump = () => {
      if (active) setFontsToken((token) => token + 1);
    };

    // Faces register only after <Excalidraw> mounts, and document.fonts.load resolves against
    // registered faces only. A microtask is enough to get behind the child's mount effect.
    const kick = window.setTimeout(() => {
      const sizes = [14, 17, 18, 20, 30];
      void Promise.allSettled(
        sizes.map((size) => document.fonts.load(boardFontString(size), boardText)),
      ).then(bump);
    }, 0);

    // Fires whenever any face finishes, including a late CDN response for a font we never asked for.
    document.fonts.addEventListener("loadingdone", bump);
    return () => {
      active = false;
      window.clearTimeout(kick);
      document.fonts.removeEventListener("loadingdone", bump);
    };
  }, [boardText]);

  // restoreElements is the only exported path that honours autoResize:false + an explicit width:
  // it wraps the text at that width and recomputes height. Both options are required - refreshDimensions
  // sits inside the repairBindings branch and is silently skipped without it.
  const elements = useMemo(
    () =>
      restoreElements(toExcalidrawElements(state), null, {
        refreshDimensions: true,
        repairBindings: true,
      }),
    // fontsToken is the point of this memo: rebuild once the real faces are in, so the widths that
    // get baked in are measured with the font the text is actually drawn in.
    [state, fontsToken],
  );

  // The board used to remount on every operation, which is fine for read-only output and fatal
  // once the learner can draw: their work would vanish the moment the tutor wrote anything. Push
  // tutor elements in through updateScene instead, and replace only the ones we put there before.
  const [api, setApi] = useState<ExcalidrawImperativeAPI | null>(null);
  const tutorElementIds = useRef<Set<string>>(new Set());
  const [sendState, setSendState] = useState<"idle" | "empty" | "sent" | "failed">("idle");
  const [draft, setDraft] = useState("");
  const [composing, setComposing] = useState(false);
  const [fingerDrawing, setFingerDrawing] = useState(true);

  useEffect(() => {
    if (!api) return;
    const nextIds = new Set(elements.map((element) => element.id));
    const previousIds = tutorElementIds.current;
    const learnerElements = api
      .getSceneElements()
      .filter((element) => !previousIds.has(element.id) && !nextIds.has(element.id));
    const boardWasEmpty = api.getSceneElements().length === 0;
    tutorElementIds.current = nextIds;
    api.updateScene({ elements: [...learnerElements, ...elements] });
    // Auto-fit only the first time the tutor writes. Refitting on every operation moves the canvas
    // under a learner who is mid-stroke or mid-word, and Excalidraw re-focuses its hidden text
    // editor on every scene update, so a refit while typing both jumps the view and steals focus.
    if (boardWasEmpty && elements.length > 0) {
      api.scrollToContent(elements, { fitToContent: true });
    }
  }, [api, elements]);

  // Excalidraw turns penMode on by itself the first time an Apple Pencil or S Pen touches the
  // board, and penMode then rejects touch for freedraw, rectangle, arrow and line - so on a shared
  // tablet "the pen worked, now my finger doesn't". The recovery toggle only appears once a pen has
  // been seen. Opt out: a stylus and a finger should both draw, on every device.
  const handleChange = useCallback(
    (_elements: unknown, appState: { penMode?: boolean }) => {
      if (fingerDrawing && appState.penMode && api) {
        api.updateScene({ appState: { penMode: false } });
      }
    },
    [api, fingerDrawing],
  );

  function addDraft(sendToTutor = false): void {
    const text = draft.trim();
    if (!api || composing || !text) return;
    const current = api.getSceneElements();
    const y =
      current.reduce((bottom, element) => Math.max(bottom, element.y + element.height), 40) + 40;
    const added = convertToExcalidrawElements([
      {
        type: "text",
        x: 80,
        y,
        text,
        fontSize: 24,
        fontFamily: 2,
      },
    ]);
    const wrapped = restoreElements(
      added.map((element) => ({ ...element, width: TEXT_WIDTH, autoResize: false })),
      null,
      { refreshDimensions: true, repairBindings: true },
    );
    api.updateScene({ elements: [...current, ...wrapped] });
    api.scrollToContent(wrapped, { fitToContent: true });
    if (sendToTutor) {
      setSendState(onSendBoardText?.(text) ? "sent" : "failed");
    }
    setDraft("");
  }

  // The board is otherwise one-way, so text the learner types is invisible to the tutor. This is
  // an explicit button rather than an auto-send on change: pushing every keystroke would interrupt
  // the tutor mid-turn and spend tokens on half-typed words.
  function sendLearnerText(): void {
    if (!api || !onSendBoardText) return;
    const learnerText = api
      .getSceneElements()
      .filter((element) => element.type === "text" && !tutorElementIds.current.has(element.id))
      .map((element) => (element as { text?: string }).text ?? "")
      .filter((line) => line.trim().length > 0)
      .join("\n");
    if (!learnerText) {
      setSendState("empty");
      return;
    }
    setSendState(onSendBoardText(learnerText) ? "sent" : "failed");
  }

  // The send row sits outside .board-canvas on purpose. Inside it, it pushed Excalidraw's
  // height:100% root down by its own height, and the overflow:hidden on .board-canvas then clipped
  // the bottom of the editor - which on phones and tablets is exactly where Excalidraw pins its
  // tool island, so the learner could not reach the tool picker at all.
  return (
    <div className="board-area">
      <div className="board-input">
        <label htmlFor="board-draft">輸入白板文字</label>
        <textarea
          id="board-draft"
          value={draft}
          maxLength={4000}
          rows={3}
          placeholder="使用鍵盤、系統手寫輸入或語音輸入，再加入白板。"
          onChange={(event) => setDraft(event.target.value)}
          onCompositionStart={() => setComposing(true)}
          onCompositionEnd={() => setComposing(false)}
        />
        <div className="board-input-actions">
          <button
            type="button"
            disabled={!api || composing || !draft.trim()}
            onClick={() => addDraft(false)}
          >
            只加入白板
          </button>
          <button
            className="secondary-button"
            type="button"
            disabled={!api || composing || !draft.trim()}
            onClick={() => addDraft(true)}
          >
            加入白板並傳給老師
          </button>
        </div>
        <label>
          <input
            type="checkbox"
            checked={fingerDrawing}
            onChange={(event) => {
              const enabled = event.target.checked;
              setFingerDrawing(enabled);
              api?.updateScene({ appState: { penMode: !enabled } });
            }}
          />
          允許手指繪圖（使用觸控筆時可關閉，減少手掌誤畫）
        </label>
        <p>畫筆可留下手寫筆跡；筆跡不會自動辨識為文字。只有文字會在你按下傳送後交給老師。</p>
      </div>
      {onSendBoardText ? (
        <div className="board-send-row">
          <button className="secondary-button" onClick={sendLearnerText} type="button">
            把白板上的文字傳給老師
          </button>
          {sendState === "empty" ? <span>白板上沒有你輸入的文字。</span> : null}
          {sendState === "sent" ? <span>已傳送，老師會回應。</span> : null}
          {sendState === "failed" ? <span>目前沒有連線，無法傳送。</span> : null}
        </div>
      ) : null}
      <div className="board-canvas" aria-label="共享德語白板">
        <Excalidraw
          excalidrawAPI={setApi}
          gridModeEnabled={false}
          onChange={handleChange}
          UIOptions={{
            canvasActions: {
              changeViewBackgroundColor: false,
              clearCanvas: false,
              export: false,
              loadScene: false,
              saveAsImage: false,
              toggleTheme: false,
            },
          }}
        />
      </div>
    </div>
  );
}

export function toExcalidrawElements(state: ClassroomBoardState) {
  const skeletons: Parameters<typeof convertToExcalidrawElements>[0] = [];
  // A running cursor rather than index * fixedStride: wrapped text is taller than one line, so a
  // fixed stride would let a two-line sentence sit on top of the next one.
  let cursorY = 80;
  state.texts.forEach((text) => {
    const germanHeight = wrappedHeight(text.textDe, 30);
    skeletons.push({
      type: "text",
      id: text.id,
      x: 80,
      y: cursorY,
      text: text.textDe,
      fontSize: 30,
      strokeColor: "#1f2937",
      width: TEXT_WIDTH,
      autoResize: false,
    });
    cursorY += germanHeight + 12;
    if (text.textZhTw) {
      skeletons.push({
        type: "text",
        id: `${text.id}_zh_tw`,
        x: 80,
        y: cursorY,
        text: text.textZhTw,
        fontSize: 18,
        strokeColor: "#0f766e",
        width: TEXT_WIDTH,
        autoResize: false,
      });
      cursorY += wrappedHeight(text.textZhTw, 18) + 12;
    }
    cursorY += 40;
  });
  state.highlights.forEach((highlight, index) => {
    skeletons.push({
      type: "rectangle",
      id: highlight.id,
      x: 76 + highlight.from * 15,
      y: 76 + index * 4,
      width: Math.max(24, (highlight.to - highlight.from) * 15),
      height: 44,
      strokeColor: highlight.color === "error" ? "#b91c1c" : "#b45309",
      backgroundColor: "#fef3c7",
      fillStyle: "solid",
      opacity: 45,
    });
  });
  state.annotations.forEach((annotation, index) => {
    skeletons.push({
      type: "text",
      id: annotation.id,
      x: 80,
      y: 150 + index * 56,
      text: annotation.textZhTw,
      fontSize: 18,
      strokeColor: "#0f766e",
      width: TEXT_WIDTH,
      autoResize: false,
    });
  });
  // Tables sit below the free text so a grid never lands on top of a sentence or its annotations.
  const tableTop = cursorY + 120;
  const CELL_WIDTH = 190;
  const CELL_HEIGHT = 52;
  state.tables.forEach((table, tableIndex) => {
    const originY = tableTop + tableIndex * 320;
    if (table.captionZhTw) {
      skeletons.push({
        type: "text",
        id: `${table.id}_caption`,
        x: 80,
        y: originY - 34,
        text: table.captionZhTw,
        fontSize: 20,
        strokeColor: "#0f766e",
        width: CELL_WIDTH * Math.max(1, table.headers.length) - 24,
        autoResize: false,
      });
    }
    table.headers.forEach((header, columnIndex) => {
      const x = 80 + columnIndex * CELL_WIDTH;
      skeletons.push({
        type: "rectangle",
        id: `${table.id}_h${columnIndex}`,
        x,
        y: originY,
        width: CELL_WIDTH,
        height: CELL_HEIGHT,
        strokeColor: "#1f2937",
        backgroundColor: "#e2e8f0",
        fillStyle: "solid",
      });
      skeletons.push({
        type: "text",
        id: `${table.id}_h${columnIndex}_t`,
        x: x + 12,
        y: originY + 16,
        text: header,
        fontSize: 18,
        strokeColor: "#1f2937",
        width: CELL_WIDTH - 24,
        autoResize: false,
      });
    });
    table.rows.forEach((row, rowIndex) => {
      const y = originY + (rowIndex + 1) * CELL_HEIGHT;
      row.forEach((cell, columnIndex) => {
        const x = 80 + columnIndex * CELL_WIDTH;
        skeletons.push({
          type: "rectangle",
          id: `${table.id}_r${rowIndex}c${columnIndex}`,
          x,
          y,
          width: CELL_WIDTH,
          height: CELL_HEIGHT,
          strokeColor: cellStroke(cell.emphasis),
          backgroundColor: cellBackground(cell.emphasis),
          fillStyle: "solid",
        });
        if (cell.textDe) {
          skeletons.push({
            type: "text",
            id: `${table.id}_r${rowIndex}c${columnIndex}_de`,
            x: x + 12,
            y: y + 8,
            text: cell.textDe,
            fontSize: 17,
            strokeColor: "#1f2937",
            width: CELL_WIDTH - 24,
            autoResize: false,
          });
        }
        if (cell.textZhTw) {
          skeletons.push({
            type: "text",
            id: `${table.id}_r${rowIndex}c${columnIndex}_zh`,
            x: x + 12,
            y: y + (cell.textDe ? 28 : 16),
            text: cell.textZhTw,
            fontSize: 14,
            strokeColor: "#0f766e",
            width: CELL_WIDTH - 24,
            autoResize: false,
          });
        }
      });
    });
  });
  // convertToExcalidrawElements throws the skeleton's width away: newTextElement overwrites
  // width/height with its own measureText result and only *stores* autoResize. So stamp the
  // intended width back on afterwards - restoreElements then wraps at that width and keeps it.
  // Without this pass the element is exactly as wide as its text, and a long sentence runs off
  // the canvas in one line instead of wrapping.
  const intendedWidth = new Map<string, number>();
  skeletons.forEach((skeleton) => {
    if (skeleton.type === "text" && skeleton.id && typeof skeleton.width === "number") {
      intendedWidth.set(skeleton.id, skeleton.width);
    }
  });
  const converted = convertToExcalidrawElements(skeletons, { regenerateIds: false });
  converted.forEach((element) => {
    const width = intendedWidth.get(element.id);
    if (element.type === "text" && width !== undefined) {
      (element as { width: number }).width = width;
    }
  });
  return converted;
}

function cellStroke(emphasis?: "correct" | "incorrect"): string {
  if (emphasis === "correct") return "#15803d";
  if (emphasis === "incorrect") return "#b91c1c";
  return "#94a3b8";
}

function cellBackground(emphasis?: "correct" | "incorrect"): string {
  if (emphasis === "correct") return "#dcfce7";
  if (emphasis === "incorrect") return "#fee2e2";
  return "#ffffff";
}

// Every string the tutor has put on the board, so document.fonts.load can be asked for the exact
// subsets these glyphs need. Xiaolai ships as 100+ CJK subsets; loading it without the text would
// fetch an arbitrary one and leave the gloss measured against a fallback anyway.
function textOnBoard(state: ClassroomBoardState): string {
  const parts: string[] = [];
  state.texts.forEach((text) => {
    parts.push(text.textDe);
    if (text.textZhTw) parts.push(text.textZhTw);
  });
  state.annotations.forEach((annotation) => parts.push(annotation.textZhTw));
  state.tables.forEach((table) => {
    if (table.captionZhTw) parts.push(table.captionZhTw);
    parts.push(...table.headers);
    table.rows.forEach((row) =>
      row.forEach((cell) => {
        if (cell.textDe) parts.push(cell.textDe);
        if (cell.textZhTw) parts.push(cell.textZhTw);
      }),
    );
  });
  return parts.join("");
}

// Reserves vertical space before the real heights are known, so a wrapped sentence cannot land on
// the next one. A CJK glyph occupies roughly a full em against about 0.55 for Latin, counted
// separately because treating Chinese as Latin-width badly underestimates the wrap.
//
// Deliberately an over-estimate: Excalifont measures nearer 0.48em, so this predicts at least as
// many lines as wrapping actually produces. It now matters - before restoreElements was added
// nothing wrapped at all, and every element was one line no matter how long.
function wrappedHeight(text: string, fontSize: number): number {
  const cjk = (text.match(/[㐀-鿿＀-￯]/gu) ?? []).length;
  const widthUnits = cjk * fontSize + (text.length - cjk) * fontSize * 0.55;
  const lines = Math.max(1, Math.ceil(widthUnits / TEXT_WIDTH));
  return lines * fontSize * 1.25;
}
