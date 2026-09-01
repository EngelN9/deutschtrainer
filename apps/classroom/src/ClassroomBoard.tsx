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
        initialData={{ elements }}
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
  return convertToExcalidrawElements(skeletons, { regenerateIds: false });
}
