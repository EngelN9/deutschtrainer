import {
  classroomToolOperationSchema,
  type ClassroomToolOperation,
} from "@deutschtrainer/validation";

export interface BoardTextElement {
  id: string;
  textDe: string;
  textZhTw?: string;
}

export interface BoardHighlight {
  color: "warn" | "error" | "focus";
  from: number;
  id: string;
  labelZhTw?: string;
  targetElementId: string;
  to: number;
}

export interface BoardAnnotation {
  id: string;
  position: "above" | "below" | "right";
  targetElementId: string;
  textZhTw: string;
}

export interface BoardTableCell {
  emphasis?: "correct" | "incorrect";
  textDe?: string;
  textZhTw?: string;
}

export interface BoardTable {
  captionZhTw?: string;
  headers: string[];
  id: string;
  rows: BoardTableCell[][];
}

export interface ClassroomBoardState {
  activeTurnId?: string;
  annotations: BoardAnnotation[];
  highlights: BoardHighlight[];
  lastOperationResult?: OperationResult;
  processedOperationIds: string[];
  supersededTurnIds: string[];
  tables: BoardTable[];
  texts: BoardTextElement[];
}

export interface OperationResult {
  code: "APPLIED" | "DUPLICATE" | "INVALID_OPERATION" | "SUPERSEDED_TURN" | "UNKNOWN_TARGET";
  message: string;
  operationId?: string;
  success: boolean;
}

export type ClassroomBoardAction =
  | { type: "begin_turn"; turnId: string }
  | { type: "supersede_turn"; turnId: string }
  | { operation: unknown; turnId: string; type: "apply_operation" }
  | { type: "reset" };

export const initialClassroomBoardState: ClassroomBoardState = {
  annotations: [],
  highlights: [],
  processedOperationIds: [],
  supersededTurnIds: [],
  tables: [],
  texts: [],
};

export function classroomBoardReducer(
  state: ClassroomBoardState,
  action: ClassroomBoardAction,
): ClassroomBoardState {
  if (action.type === "reset") {
    return initialClassroomBoardState;
  }
  if (action.type === "begin_turn") {
    const supersededTurnIds =
      state.activeTurnId && state.activeTurnId !== action.turnId
        ? appendUnique(state.supersededTurnIds, state.activeTurnId)
        : state.supersededTurnIds;
    return { ...state, activeTurnId: action.turnId, supersededTurnIds };
  }
  if (action.type === "supersede_turn") {
    const nextState = { ...state };
    if (nextState.activeTurnId === action.turnId) {
      delete nextState.activeTurnId;
    }
    return {
      ...nextState,
      supersededTurnIds: appendUnique(state.supersededTurnIds, action.turnId),
    };
  }

  const parsed = classroomToolOperationSchema.safeParse(action.operation);
  if (!parsed.success) {
    return withResult(state, {
      code: "INVALID_OPERATION",
      message: "白板操作格式不正確。",
      success: false,
    });
  }
  return applyOperation(state, parsed.data, action.turnId);
}

function applyOperation(
  state: ClassroomBoardState,
  operation: ClassroomToolOperation,
  turnId: string,
): ClassroomBoardState {
  if (state.processedOperationIds.includes(operation.operationId)) {
    return withResult(state, {
      code: "DUPLICATE",
      message: "重複操作已忽略。",
      operationId: operation.operationId,
      success: true,
    });
  }
  if (
    state.supersededTurnIds.includes(turnId) ||
    (state.activeTurnId !== undefined && state.activeTurnId !== turnId)
  ) {
    return withResult(state, {
      code: "SUPERSEDED_TURN",
      message: "已捨棄被插話取代的操作。",
      operationId: operation.operationId,
      success: false,
    });
  }

  const processedOperationIds = [...state.processedOperationIds, operation.operationId];
  if (operation.type === "write_line") {
    if (state.texts.some((element) => element.id === operation.elementId)) {
      return failureWithProcessed(state, processedOperationIds, operation, "UNKNOWN_TARGET");
    }
    return applied(
      {
        ...state,
        processedOperationIds,
        texts: [
          ...state.texts,
          {
            id: operation.elementId,
            textDe: operation.textDe,
            ...(operation.textZhTw ? { textZhTw: operation.textZhTw } : {}),
          },
        ],
      },
      operation,
    );
  }

  if (operation.type === "write_table") {
    if (state.tables.some((table) => table.id === operation.elementId)) {
      return failureWithProcessed(state, processedOperationIds, operation, "UNKNOWN_TARGET");
    }
    return applied(
      {
        ...state,
        processedOperationIds,
        tables: [
          ...state.tables,
          {
            id: operation.elementId,
            headers: [...operation.headers],
            rows: operation.rows.map((row) =>
              row.map((cell) => ({
                ...(cell.textDe ? { textDe: cell.textDe } : {}),
                ...(cell.textZhTw ? { textZhTw: cell.textZhTw } : {}),
                ...(cell.emphasis ? { emphasis: cell.emphasis } : {}),
              })),
            ),
            ...(operation.captionZhTw ? { captionZhTw: operation.captionZhTw } : {}),
          },
        ],
      },
      operation,
    );
  }

  const target = state.texts.find((element) => element.id === operation.targetElementId);
  if (!target) {
    return failureWithProcessed(state, processedOperationIds, operation, "UNKNOWN_TARGET");
  }

  if (operation.type === "highlight_span") {
    if (operation.to > target.textDe.length) {
      return failureWithProcessed(state, processedOperationIds, operation, "INVALID_OPERATION");
    }
    return applied(
      {
        ...state,
        processedOperationIds,
        highlights: [
          ...state.highlights,
          {
            color: operation.color,
            from: operation.from,
            id: operation.overlayElementId,
            ...(operation.labelZhTw ? { labelZhTw: operation.labelZhTw } : {}),
            targetElementId: operation.targetElementId,
            to: operation.to,
          },
        ],
      },
      operation,
    );
  }

  if (operation.type === "annotate") {
    return applied(
      {
        ...state,
        annotations: [
          ...state.annotations,
          {
            id: operation.elementId,
            position: operation.position,
            targetElementId: operation.targetElementId,
            textZhTw: operation.textZhTw,
          },
        ],
        processedOperationIds,
      },
      operation,
    );
  }

  return applied(
    {
      ...state,
      highlights: state.highlights.filter(
        (highlight) => highlight.targetElementId !== operation.targetElementId,
      ),
      processedOperationIds,
      texts: state.texts.map((element) =>
        element.id === operation.targetElementId
          ? { ...element, textDe: operation.newTextDe }
          : element,
      ),
    },
    operation,
  );
}

function appendUnique(values: string[], value: string): string[] {
  return values.includes(value) ? values : [...values, value];
}

function withResult(state: ClassroomBoardState, result: OperationResult): ClassroomBoardState {
  return { ...state, lastOperationResult: result };
}

function applied(
  state: ClassroomBoardState,
  operation: ClassroomToolOperation,
): ClassroomBoardState {
  return withResult(state, {
    code: "APPLIED",
    message: "白板操作已套用。",
    operationId: operation.operationId,
    success: true,
  });
}

function failureWithProcessed(
  state: ClassroomBoardState,
  processedOperationIds: string[],
  operation: ClassroomToolOperation,
  code: OperationResult["code"],
): ClassroomBoardState {
  return withResult(
    { ...state, processedOperationIds },
    {
      code,
      message: code === "UNKNOWN_TARGET" ? "找不到白板目標。" : "白板範圍不正確。",
      operationId: operation.operationId,
      success: false,
    },
  );
}
