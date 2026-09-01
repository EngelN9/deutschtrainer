---
pretty_name: DeutschTrainer Writing Feedback Synthetic Evaluation
language:
  - de
  - zh
task_categories:
  - text-generation
tags:
  - synthetic
  - evaluation
  - german-learning
configs:
  - config_name: default
    data_files:
      - split: test
        path: writing-feedback-eval.v1.jsonl
---

# DeutschTrainer Writing Feedback Evaluation

> SYNTHETIC EVALUATION — NOT REAL LEARNER EVIDENCE

This private dataset contains 36 deterministic synthetic fixtures for evaluating German learner
writing feedback presented in Traditional Chinese. It contains no real essays, recordings, email
addresses, Supabase identifiers, production logs, provider outputs, or credentials.

## Intended use

- Private prompt, schema, and model comparison for DeutschTrainer development.
- Deterministic smoke checks for German correction, Traditional Chinese facets, and output contracts.

## Prohibited claims and uses

- This dataset is not production-readiness evidence, teacher certification, human learner quality
  evidence, or a statistically representative sample.
- Gold corrections and expected facets must remain private to limit benchmark contamination.
- Licensing and provenance review is incomplete; the repository and dataset must remain private.
- A model registry entry marked `NOT_EVALUATED` is a candidate, not a winner or recommendation for
  production.

## Privacy and provenance

Rows are deterministically derived only from the synthetic catalog on the
`codex/matraix-evaluation` lineage. Every row includes the source catalog SHA-256 fingerprint and
`synthetic_only: true`. Export fails closed when direct-contact PII, UUID-shaped identifiers,
provider tokens, or production identifier markers are detected.

## Dataset contents

- `writing-feedback-eval.v1.jsonl`: 36 sorted schema-validated fixtures.
- `schema.v1.json`: machine-readable JSON Schema.
- `metadata.v1.json`: deterministic row/source hashes and private-use boundaries.
- `model-registry.v1.json`: candidates, all initially `NOT_EVALUATED`.

No inference is run by the exporter and no provider outputs are included.
