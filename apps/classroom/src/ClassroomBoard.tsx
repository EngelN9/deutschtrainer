import { convertToExcalidrawElements, Excalidraw } from "@excalidraw/excalidraw";
import "@excalidraw/excalidraw/index.css";
import { useMemo } from "react";
import type { ClassroomBoardState } from "./boardReducer";

export function ClassroomBoard({ state }: { state: ClassroomBoardState }) {
  const elements = useMemo(() => toExcalidrawElements(state), [state]);
  const boardKey = state.processedOperationIds.join(":") || "empty";

  return (
    <div className="board-canvas" aria-label="共享德語白板">
      <Excalidraw
        key={boardKey}
        // Without this the view stays parked at the origin and a long German sentence runs off
        // the right edge, which is most of them.
        initialData={{ elements, scrollToContent: true }}
        viewModeEnabled
        zenModeEnabled
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
  state.texts.forEach((text, index) => {
    const y = 80 + index * 180;
    skeletons.push({
      type: "text",
      id: text.id,
      x: 80,
      y,
      text: text.textDe,
      fontSize: 30,
      strokeColor: "#1f2937",
    });
    if (text.textZhTw) {
      skeletons.push({
        type: "text",
        id: `${text.id}_zh_tw`,
        x: 80,
        y: y + 52,
        text: text.textZhTw,
        fontSize: 18,
        strokeColor: "#0f766e",
      });
    }
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
    });
  });
  // Tables sit below the free text so a grid never lands on top of a sentence or its annotations.
  const tableTop = 220 + state.texts.length * 180;
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
