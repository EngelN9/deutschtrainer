---
name: german-content-qa
description: "Review DeutschTrainer German learning content for language accuracy, CEFR fit, Traditional Chinese explanations, answer consistency, lexical metadata, and publication provenance. Use for German content QA, CEFR review, seed-content review, answer/explanation checks, or AI-draft editorial review; do not use for core architecture, RLS, or learning-engine changes."
---

# German Content QA

## Inputs

Collect:

- Content scope: changed files, seed rows, content IDs, course/lesson, CEFR level, or full published corpus.
- Source: human-authored, imported, or AI-generated.
- Current status, review status, reviewer evidence, and intended publication target.
- Review coverage: all items or an explicitly bounded sample.
- Locale or variety conventions when product requirements specify them.

If reviewing a sample, state selection method and scope. Do not extrapolate it into full-corpus readiness.

## Locate Canonical Content

1. Read `supabase/seed.sql` and content-related migrations.
2. Read `docs/acceptance-criteria.md`, `docs/definition-of-done.md`, and release content requirements.
3. Trace the content model and review/publish workflow through shared types, validation, API repositories, and Admin code.
4. Identify each canonical version. Do not review a stale draft as published content.
5. Record level, exercise type, source type, version, publication status, review status, and reviewer evidence.

Do not change core schemas, routes, authorization, or architecture while running this skill.

## Run Structural Evidence

When local Supabase and API are available:

```powershell
pnpm supabase:status
pnpm --filter @deutschtrainer/api verify:content-readiness:local
```

Use this only for structural evidence such as counts, level/type coverage, answers, publication, and approval state. It does not prove German accuracy, CEFR validity, or editorial quality. Mark unavailable database coverage `BLOCKED` and continue file-level review.

## Review Each Item

### German Form

- Verify spelling, capitalization, punctuation, quotation, and current orthography.
- Verify grammar, word order, agreement, tense, mood, voice, negation, and register.
- Verify natural, idiomatic German appropriate to context.
- Reject prompts with unintended ambiguity or multiple hidden tasks.

### CEFR Fit

- Verify vocabulary, syntax, abstraction, text length, inference burden, and task complexity fit B1-C2.
- Distinguish sophisticated topics from actual language difficulty.
- Flag reliance on knowledge outside taught scope or level.
- Explain re-leveling with evidence rather than intuition alone.

### Traditional Chinese

- Require Traditional, not Simplified, Chinese.
- Verify explanations align with German and are learner-friendly.
- Verify translations preserve meaning, register, tense, modality, and pragmatic force.
- Avoid misleading word-for-word explanations of idioms.

### Answer Contract

- Verify prompt, options, canonical answer, accepted answers, explanation, and target skill agree.
- Identify all reasonable alternatives the grader should accept.
- Reject multiple choice with more than one defensible answer or no correct answer.
- Confirm blanks and corrections preserve grammar and intended meaning.
- Confirm no learner-visible field leaks the answer before submission.

### Lexical and Grammatical Metadata

- Verify noun article, plural, capitalization, and meaning.
- Verify verb principal forms, auxiliary, separability, reflexivity, preposition, and governed case.
- Verify collocations, register labels, grammar links, examples, and translations.
- Mark a category `NOT APPLICABLE` when the item genuinely lacks that metadata.

### Provenance and Review

- Verify content version and publication state are coherent.
- Require AI-generated content to remain draft until human approval.
- Treat missing human-review evidence as `FAIL` for publication readiness.
- Distinguish editorially valid draft from publish-ready content.

## Handle Findings

For each issue, provide content ID or file/line, shortest identifying quote, severity, rule/evidence, and recommended correction. Use:

- `CRITICAL`: harmful meaning, privacy/answer leakage, or fundamentally wrong published teaching.
- `HIGH`: wrong answer, unaccepted valid answers, serious grammar error, or materially wrong CEFR.
- `MEDIUM`: misleading explanation, unnatural register, incomplete metadata, or locale inconsistency.
- `LOW`: punctuation, style, or non-blocking polish.

Keep acceptable alternatives distinct from preferred model answers.

## Output and Pass Conditions

Return:

1. Scope, levels, statuses, source types, and coverage.
2. Findings sorted by severity with location, level, field, evidence, correction, and status.
3. Coverage matrix for German, CEFR, zh-TW, answer contract, metadata, version/publication, and AI human review.
4. Structural command evidence.
5. Publication blockers.
6. Overall `PASS`, `FAIL`, `BLOCKED`, or `NOT APPLICABLE`.

Use `PASS` only for an explicitly reviewed scope with complete applicable evidence. Use `FAIL` for a confirmed defect or missing required human approval. Use `BLOCKED` for missing canonical text, metadata, reviewer evidence, or required full-corpus coverage. Use `NOT APPLICABLE` only for categories absent from scoped content.
