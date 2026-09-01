import { describe, expect, it } from "@jest/globals";
import { classroomBoardReducer, initialClassroomBoardState } from "./boardReducer";
import { MILESTONE_TURN_ID, milestoneOperations } from "./milestoneFixture";

// Server-generated response ids, in the shape the Realtime API actually emits. Tests must never
// use a hand-readable turn id shared with the model: the model cannot know this value, and
// pretending otherwise is what let a broken integration pass a green suite.
const TURN = MILESTONE_TURN_ID;
const EARLIER_TURN = "resp_A1bC2dE3fG4hI5jK";

describe("classroomBoardReducer", () => {
  it("applies an operation attributed to the active response id", () => {
    // The regression. The client stamps turnId from the event's response_id, so an operation
    // produced during the active turn must apply. Previously the model was asked to supply this
    // id itself, which it cannot know, so every real operation was rejected as SUPERSEDED_TURN.
    const started = classroomBoardReducer(initialClassroomBoardState, {
      type: "begin_turn",
      turnId: TURN,
    });
    const applied = classroomBoardReducer(started, {
      type: "apply_operation",
      operation: milestoneOperations[0],
      turnId: TURN,
    });

    expect(applied.lastOperationResult?.code).toBe("APPLIED");
    expect(applied.texts).toEqual([
      { id: "sentence_main", textDe: "Ich gehe gestern in die Schule." },
    ]);
  });

  it("rejects a payload that carries its own turnId", () => {
    // Guards the contract itself: turnId is transport metadata, not part of the tool payload.
    // The strict schema must refuse an operation that reintroduces it.
    const started = classroomBoardReducer(initialClassroomBoardState, {
      type: "begin_turn",
      turnId: TURN,
    });
    const smuggled = classroomBoardReducer(started, {
      type: "apply_operation",
      operation: { ...milestoneOperations[0], turnId: TURN },
      turnId: TURN,
    });
    expect(smuggled.lastOperationResult?.code).toBe("INVALID_OPERATION");
  });

  it("applies the four milestone operations in order", () => {
    let state = classroomBoardReducer(initialClassroomBoardState, {
      type: "begin_turn",
      turnId: TURN,
    });
    for (const operation of milestoneOperations) {
      state = classroomBoardReducer(state, {
        type: "apply_operation",
        operation,
        turnId: TURN,
      });
    }

    expect(state.texts).toEqual([
      { id: "sentence_main", textDe: "Ich bin gestern in die Schule gegangen." },
    ]);
    expect(state.annotations).toEqual([
      {
        id: "note_past",
        position: "below",
        targetElementId: "sentence_main",
        textZhTw: "gestern 表示過去，因此要使用完成式。",
      },
    ]);
    expect(state.highlights).toEqual([]);
    expect(state.lastOperationResult?.code).toBe("APPLIED");
  });

  it("treats a repeated operation ID as an idempotent no-op", () => {
    const started = classroomBoardReducer(initialClassroomBoardState, {
      type: "begin_turn",
      turnId: TURN,
    });
    const once = classroomBoardReducer(started, {
      type: "apply_operation",
      operation: milestoneOperations[0],
      turnId: TURN,
    });
    const replay = classroomBoardReducer(once, {
      type: "apply_operation",
      operation: milestoneOperations[0],
      turnId: TURN,
    });
    expect(replay.texts).toEqual(once.texts);
    expect(replay.lastOperationResult?.code).toBe("DUPLICATE");
  });

  it("rejects invalid spans, unknown targets, and raw HTML", () => {
    const started = classroomBoardReducer(initialClassroomBoardState, {
      type: "begin_turn",
      turnId: TURN,
    });
    const written = classroomBoardReducer(started, {
      type: "apply_operation",
      operation: milestoneOperations[0],
      turnId: TURN,
    });
    const invalidSpan = classroomBoardReducer(written, {
      type: "apply_operation",
      turnId: TURN,
      operation: {
        type: "highlight_span",
        operationId: "op_bad_span",
        targetElementId: "sentence_main",
        overlayElementId: "highlight_bad",
        from: 0,
        to: 999,
        color: "error",
      },
    });
    expect(invalidSpan.lastOperationResult?.code).toBe("INVALID_OPERATION");

    const unknownTarget = classroomBoardReducer(written, {
      type: "apply_operation",
      turnId: TURN,
      operation: {
        type: "replace_text",
        operationId: "op_unknown",
        targetElementId: "missing",
        newTextDe: "Korrektur",
      },
    });
    expect(unknownTarget.lastOperationResult?.code).toBe("UNKNOWN_TARGET");

    const html = classroomBoardReducer(written, {
      type: "apply_operation",
      turnId: TURN,
      operation: {
        type: "annotate",
        operationId: "op_html",
        targetElementId: "sentence_main",
        elementId: "note_html",
        textZhTw: "<strong>不允許</strong>",
        position: "below",
      },
    });
    expect(html.lastOperationResult?.code).toBe("INVALID_OPERATION");
  });

  it("drops late work from a superseded turn", () => {
    const started = classroomBoardReducer(initialClassroomBoardState, {
      type: "begin_turn",
      turnId: TURN,
    });
    const superseded = classroomBoardReducer(started, {
      type: "supersede_turn",
      turnId: TURN,
    });
    const late = classroomBoardReducer(superseded, {
      type: "apply_operation",
      operation: milestoneOperations[0],
      turnId: TURN,
    });
    expect(late.texts).toHaveLength(0);
    expect(late.lastOperationResult?.code).toBe("SUPERSEDED_TURN");
  });

  it("drops an operation belonging to a previous response", () => {
    // Barge-in: the learner interrupted, a new turn began, and a tool call from the old response
    // arrives late. It must not land on the board.
    let state = classroomBoardReducer(initialClassroomBoardState, {
      type: "begin_turn",
      turnId: EARLIER_TURN,
    });
    state = classroomBoardReducer(state, { type: "begin_turn", turnId: TURN });
    const late = classroomBoardReducer(state, {
      type: "apply_operation",
      operation: milestoneOperations[0],
      turnId: EARLIER_TURN,
    });

    expect(late.texts).toHaveLength(0);
    expect(late.lastOperationResult?.code).toBe("SUPERSEDED_TURN");
  });
});
