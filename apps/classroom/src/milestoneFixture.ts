import type { ClassroomToolOperation } from "@deutschtrainer/validation";

// The milestone exchange exactly as the model emits it: operation payloads only. The owning turn
// is never part of this payload — it is stamped by the client from the Realtime event's
// response_id. An earlier version of this fixture carried a hand-picked `turnId: "turn_demo"` on
// both sides of that boundary, which made every test pass while no real operation could ever be
// accepted.
export const milestoneOperations = [
  {
    type: "write_line",
    operationId: "op_write",
    elementId: "sentence_main",
    textDe: "Ich gehe gestern in die Schule.",
  },
  {
    type: "highlight_span",
    operationId: "op_highlight",
    targetElementId: "sentence_main",
    overlayElementId: "highlight_gestern",
    from: 9,
    to: 16,
    color: "error",
    labelZhTw: "過去時間標記",
  },
  {
    type: "annotate",
    operationId: "op_annotate",
    targetElementId: "sentence_main",
    elementId: "note_past",
    textZhTw: "gestern 表示過去，因此要使用完成式。",
    position: "below",
  },
  {
    type: "replace_text",
    operationId: "op_replace",
    targetElementId: "sentence_main",
    newTextDe: "Ich bin gestern in die Schule gegangen.",
  },
] satisfies ClassroomToolOperation[];

// A realistic server-generated response id. The simulator must not use a hand-readable value,
// because the whole point of the regression is that the model cannot know this string.
export const MILESTONE_TURN_ID = "resp_C8kQ2mXvT1aBcDeF";
