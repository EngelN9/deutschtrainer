from __future__ import annotations

import json
from pathlib import Path

from .models import EvaluationCell, EvaluationRecord, ExpandedScenario
from .planning import presented_feedback
from .scoring import persona_response_from_survey_artifact, score_payload
from .serialization import write_json


def ingest_survey_result(
    *,
    survey_result_path: Path,
    cell: EvaluationCell,
    scenario: ExpandedScenario,
    record_path: Path,
) -> EvaluationRecord:
    payload = json.loads(survey_result_path.read_text(encoding="utf-8"))
    normalized = persona_response_from_survey_artifact(payload)
    presentation = presented_feedback(scenario, cell.feedback_variant)
    record = score_payload(
        cell=cell,
        scenario=scenario,
        presentation=presentation,
        payload=normalized,
    )
    write_json(record_path, record)
    return record
