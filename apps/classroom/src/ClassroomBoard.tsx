import { convertToExcalidrawElements, Excalidraw } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";
import type { ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ClassroomBoardState } from "./boardReducer";

// Wide enough for a normal German sentence at fontSize 30, narrow enough that a long one wraps
// instead of running off into empty canvas.
const TEXT_WIDTH = 900;

export function ClassroomBoard({
  state,
  onSendBoardText,
}: {
  onSendBoardText?: (text: string) => boolean;
  state: ClassroomBoardState;
}) {
  // Excalidraw bakes a text element's width in at convertToExcalidrawElements time by measuring
  // the string, and its handwriting font loads asynchronously. Measured before the font arrives,
  // the box comes out narrower than the text later drawn into it and the last characters are cut
  // off. fontsReady is a dependency here, not just a remount key: remounting with the same
  // already-measured element objects changes nothing.
  const [fontsReady, setFontsReady] = useState(false);
  useEffect(() => {
    let active = true;
    void document.fonts.ready.then(() => {
      if (active) setFontsReady(true);
    });
    return () => {
      active = false;
    };
  }, []);

  const elements = useMemo(() => toExcalidrawElements(state), [state, fontsReady]);

  // The board used to remount on every operation, which is fine for read-only output and fatal
  // once the learner can draw: their work would vanish the moment the tutor wrote anything. Push
  // tutor elements in through updateScene instead, and replace only the ones we put there before.
  const [api, setApi] = useState<ExcalidrawImperativeAPI | null>(null);
  const tutorElementIds = useRef<Set<string>>(new Set());
  const [sendState, setSendState] = useState<"idle" | "empty" | "sent" | "failed">("idle");

  useEffect(() => {
    if (!api) return;
    const nextIds = new Set(elements.map((element) => element.id));
    const previousIds = tutorElementIds.current;
    const learnerElements = api
      .getSceneElements()
      .filter((element) => !previousIds.has(element.id) && !nextIds.has(element.id));
    tutorElementIds.current = nextIds;
    api.updateScene({ elements: [...learnerElements, ...elements] });
    if (elements.length > 0) {
      api.scrollToContent(elements, { fitToContent: true });
    }
  }, [api, elements]);

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

  return (
    <div className="board-canvas" aria-label="共享德語白板">
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
      <Excalidraw
        excalidrawAPI={setApi}
        gridModeEnabled={false}
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
          });
        }
      });
    });
  });
  return convertToExcalidrawElements(skeletons, { regenerateIds: false });
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

// Excalidraw wraps at the element width, so height depends on how many lines the string needs.
// A CJK glyph occupies roughly a full em against about 0.55 for Latin, so they are counted
// separately - treating Chinese as Latin-width badly underestimates the wrap and overlaps.
function wrappedHeight(text: string, fontSize: number): number {
  const cjk = (text.match(/[㐀-鿿＀-￯]/gu) ?? []).length;
  const widthUnits = cjk * fontSize + (text.length - cjk) * fontSize * 0.55;
  const lines = Math.max(1, Math.ceil(widthUnits / TEXT_WIDTH));
  return lines * fontSize * 1.25;
}
