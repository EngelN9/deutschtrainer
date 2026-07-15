# Phase 13 Vocabulary And Grammar Knowledge Library

## Scope

- Searchable B1-C2 vocabulary and grammar libraries for Traditional Chinese learners.
- CEFR filtering, pagination, published-only delivery, detailed linguistic metadata, and related exercises.
- Dedicated Mobile list/detail routes with loading, empty, error, retry, offline, and responsive states.

## API Boundary

- `GET /vocabulary` supports `level`, `query`, `partOfSpeech`, `register`, `region`, `page`, and `pageSize`.
- `GET /vocabulary/:itemId` returns the complete vocabulary record plus published related exercises.
- `GET /grammar-topics` supports `level`, `query`, `difficulty`, `page`, and `pageSize`.
- `GET /grammar-topics/:topicId` returns rules, examples, common mistakes, prerequisites, skills, and related exercises.
- All four endpoints use independent Zod request/response contracts, return only `published` content, and use short public cache headers.

## Content Model

- Vocabulary exposes gender, plural, principal parts, separable/reflexive behavior, governed case, required preposition, definitions, examples, collocations, synonyms, antonyms, register, region, and optional audio.
- Grammar rules, examples, and common mistakes use structured objects instead of untyped display strings.
- Seed content contains 50 published vocabulary items and 10 published grammar topics across B1, B2, C1, and C2.
- Each seeded grammar topic has at least one rule, translated example, Chinese-learner mistake contrast, related skill, and prerequisite mapping where applicable.

## Mobile Behavior

- The main navigation includes a knowledge entry without replacing courses, writing, audio, reviews, or analytics.
- A two-mode segmented control switches between vocabulary and grammar; search accepts German and Traditional Chinese text.
- CEFR filters and page controls preserve stable dimensions at narrow and desktop widths.
- Detail pages expose selectable German text and open the exact related exercise in a focused practice session.
- Knowledge content remains online-only; offline state is explicit and downloaded lessons remain available through the course area.

## Verification

- Validation tests cover pagination defaults and detailed vocabulary/grammar contracts.
- Knowledge service tests cover German/Chinese search, facets, filtering, detail aliases, related exercises, and public `404` behavior.
- `pnpm --filter @deutschtrainer/api verify:knowledge:local` checks 50 vocabulary items, pagination, cache headers, published status, detailed metadata, grammar structures, related exercises, invalid filters, and missing records against local Supabase.
- Expo Web and Playwright cover desktop and 390 px knowledge search, mode switching, detail views, related-exercise navigation, and horizontal-overflow checks.
