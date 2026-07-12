# Database Schema

## 1. 原則

- 使用 Supabase PostgreSQL。
- 所有資料表都有主鍵、created_at、updated_at。
- 使用 RLS，使用者只能讀寫自己的學習紀錄。
- 發布課程資料可公開讀取；草稿只允許內容角色讀取。
- 管理操作寫入 audit_logs。
- 可刪除使用者資料的表需支援 deleted_at 或明確刪除策略。
- 所有 enum 值需與 TypeScript/Zod 保持一致。

## 2. Enums

```text
cefr_level: B1, B2, C1, C2
role: learner, content_editor, reviewer, admin
skill_category: vocabulary, grammar, reading, listening, writing, speaking, interaction, mediation, pronunciation, exam_preparation
exercise_type: multiple_choice, multiple_select, fill_blank, sentence_order, matching, translation, dictation, error_correction, reading_comprehension, listening_comprehension, free_response, speaking, conversation, essay, summary, paraphrase, argumentation, mediation, oral_presentation
source_type: human, ai_generated, ai_assisted
review_status: draft, pending_review, approved, rejected
content_status: draft, pending_review, approved, published, rejected, archived
error_type: spelling, capitalization, punctuation, article, gender, case, declension, adjective_ending, verb_conjugation, tense, auxiliary, word_order, subordinate_clause, preposition, verb_preposition, pronoun, relative_clause, passive_voice, subjunctive, collocation, word_choice, register, coherence, cohesion, argumentation, task_completion, style, idiomaticity, redundancy, ambiguity, pronunciation, fluency
error_severity: minor, moderate, major, critical
review_queue_status: scheduled, completed, skipped, cancelled
```

## 3. 核心課程資料表

| Table                | 主要欄位                                                                                                                                                                | 關聯與索引                                                | RLS                                            |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- | ---------------------------------------------- |
| courses              | id, level, title_zh_tw, title_de, description_zh_tw, status, version, published_at, deleted_at                                                                          | index(level,status)                                       | published public read, editor draft read/write |
| units                | id, course_id, title_zh_tw, order_index, status, version, deleted_at                                                                                                    | fk courses, index(course_id,status)                       | follows course                                 |
| lessons              | id, unit_id, level, title_zh_tw, estimated_minutes, cefr_descriptor, objectives, prerequisite_skill_ids, status, version, deleted_at                                    | fk units, index(unit_id,status)                           | follows unit                                   |
| activities           | id, lesson_id, type, title_zh_tw, order_index, content_json, status, version, deleted_at                                                                                | fk lessons, index(lesson_id)                              | follows lesson                                 |
| exercises            | id, activity_id, level, type, title, instruction_zh_tw, prompt_de, payload_json, estimated_seconds, difficulty, source_type, review_status, status, version, deleted_at | fk activities, index(type,level,status), GIN payload_json | published/approved public read                 |
| exercise_options     | id, exercise_id, label, text_de, text_zh_tw, order_index, is_correct, metadata_json                                                                                     | fk exercises, index(exercise_id)                          | follows exercise                               |
| exercise_answers     | id, exercise_id, answer_json, grading_policy_json, explanation_zh_tw                                                                                                    | fk exercises, unique(exercise_id)                         | follows exercise                               |
| exercise_skill_links | id, exercise_id, skill_id, weight                                                                                                                                       | fk exercises, fk skills, unique(exercise_id,skill_id)     | follows exercise                               |

## 4. 技能、文法與單字

| Table               | 主要欄位                                                                                                                                                                                                                                                                    | 關聯與索引                                                       | RLS                                 |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | ----------------------------------- |
| skills              | id, code, name_zh_tw, name_de, description_zh_tw, level, category, mastery_threshold, review_policy_json, status                                                                                                                                                            | unique(code), index(level,category)                              | published public read, editor write |
| skill_prerequisites | id, skill_id, prerequisite_skill_id                                                                                                                                                                                                                                         | fk skills twice, unique(skill_id, prerequisite_skill_id)         | follows skills                      |
| grammar_topics      | id, title_zh_tw, title_de, level, short_explanation_zh_tw, full_explanation_zh_tw, rules_json, examples_json, common_mistakes_json, difficulty, status, version                                                                                                             | index(level,status)                                              | published public read               |
| vocabulary          | id, lemma, part_of_speech, gender, plural, principal_parts_json, separable_prefix, reflexive, governing_case, required_preposition, level, frequency_rank, definitions_zh_tw, collocations_json, synonyms_json, antonyms_json, register, region, audio_url, status, version | index(level,lemma), index(part_of_speech), index(frequency_rank) | published public read               |
| vocabulary_examples | id, vocabulary_id, sentence_de, translation_zh_tw, level, audio_url, source, license                                                                                                                                                                                        | fk vocabulary, index(vocabulary_id)                              | follows vocabulary                  |

## 5. 使用者與進度

| Table            | 主要欄位                                                                                                                                                                                                                                | 關聯與索引                                                                            | RLS                          |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ---------------------------- |
| profiles         | id, auth_user_id, display_name, role, timezone, deleted_at                                                                                                                                                                              | unique(auth_user_id), index(role)                                                     | self read/update, admin read |
| user_preferences | id, user_id, daily_minutes, target_level, notification_settings_json, theme, audio_settings_json                                                                                                                                        | fk profiles, unique(user_id)                                                          | self only                    |
| user_levels      | id, user_id, current_level, target_level, placement_status, placement_result_json                                                                                                                                                       | fk profiles, index(user_id,current_level)                                             | self only                    |
| attempts         | id, user_id, exercise_id, lesson_id, submitted_at, score, is_correct, duration_ms, used_hint, mode, idempotency_key                                                                                                                     | fk user/exercise/lesson, unique(user_id,idempotency_key), index(user_id,submitted_at) | self only                    |
| attempt_answers  | id, attempt_id, exercise_id, answer_json, normalized_answer_json, grading_result_json                                                                                                                                                   | fk attempts, index(attempt_id)                                                        | self only                    |
| error_records    | id, user_id, attempt_id, exercise_id, lesson_id, skill_id, grammar_topic_id, vocabulary_id, type, severity, original, correction, explanation_zh_tw, related_skill_id                                                                   | fk relevant tables, index(user_id,type), index(user_id,skill_id)                      | self only                    |
| skill_mastery    | id, user_id, skill_id, mastery_score, confidence_score, attempt_count, correct_count, incorrect_count, hint_count, average_response_time_ms, last_practiced_at, next_review_at, correct_streak, incorrect_streak, last_error_types_json | unique(user_id,skill_id), index(user_id,next_review_at)                               | self only                    |
| review_queue     | id, user_id, skill_id, exercise_id, priority, scheduled_at, reason, interval_days, ease_factor, status                                                                                                                                  | index(user_id,status,scheduled_at), fk user/skill/exercise                            | self only                    |
| lesson_progress  | id, user_id, lesson_id, status, completion_percent, last_activity_id, completed_at                                                                                                                                                      | unique(user_id,lesson_id)                                                             | self only                    |
| course_progress  | id, user_id, course_id, completion_percent, completed_lessons, total_lessons, last_lesson_id                                                                                                                                            | unique(user_id,course_id)                                                             | self only                    |

## 6. 寫作、AI、對話、聽力與口說

| Table                  | 主要欄位                                                                                                                                                                                                      | 關聯與索引                                                   | RLS                                                 |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | --------------------------------------------------- |
| writing_submissions    | id, user_id, lesson_id, prompt_id, level, writing_type, current_version_id, status                                                                                                                            | index(user_id,created_at)                                    | self only                                           |
| writing_versions       | id, submission_id, version_number, text_de, diff_json, ai_feedback_id                                                                                                                                         | fk writing_submissions, unique(submission_id,version_number) | self only                                           |
| ai_feedback            | id, user_id, feature, target_type, target_id, schema_version, feedback_json, requires_human_review, cached_from_id                                                                                            | index(user_id,feature), index(target_type,target_id)         | self only; reviewer aggregate no sensitive text     |
| conversation_scenarios | id, level, scenario, user_role, ai_role, learning_objectives_json, allowed_vocabulary_json, target_grammar_json, maximum_turns, feedback_frequency, correction_style, register, success_criteria_json, status | index(level,status)                                          | published public read                               |
| conversation_sessions  | id, user_id, scenario_id, status, started_at, completed_at, summary_feedback_json                                                                                                                             | fk scenario/user, index(user_id,status)                      | self only                                           |
| conversation_messages  | id, session_id, role, content_de, content_zh_tw, turn_index, ai_feedback_id                                                                                                                                   | fk session, index(session_id,turn_index)                     | self only                                           |
| speaking_submissions   | id, user_id, exercise_id, audio_asset_id, transcript_de, target_text_de, words_per_minute, pauses_json, feedback_json                                                                                         | index(user_id,created_at)                                    | self only                                           |
| listening_assets       | id, lesson_id, level, title, transcript_de, transcript_zh_tw, audio_asset_id, normal_speed_url, slow_speed_url, source, license, status                                                                       | index(level,status)                                          | published public read                               |
| audio_assets           | id, owner_user_id, storage_path, source_type, license, duration_ms, transcript_de, metadata_json, deleted_at                                                                                                  | index(owner_user_id), index(storage_path)                    | public for published content; self for user uploads |

## 7. 內容治理與系統表

| Table              | 主要欄位                                                                                                                  | 關聯與索引                                                    | RLS                           |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- | ----------------------------- |
| content_versions   | id, entity_type, entity_id, version, diff_json, created_by, status                                                        | index(entity_type,entity_id,version)                          | editor/reviewer/admin         |
| content_reviews    | id, entity_type, entity_id, reviewer_id, status, reason, reviewed_at                                                      | index(entity_type,entity_id,status)                           | reviewer/admin                |
| ai_generation_jobs | id, requested_by, target_entity_type, level, topic, skill_ids, exercise_type, status, output_json, validation_errors_json | index(status,created_at)                                      | editor/reviewer/admin         |
| ai_usage_logs      | id, user_id, feature, model, input_tokens, output_tokens, estimated_cost, latency_ms, success, error_code, created_at     | index(user_id,created_at), index(feature,created_at)          | self summary, admin aggregate |
| feature_flags      | id, key, description, enabled, audience_json, updated_by                                                                  | unique(key)                                                   | admin write, backend read     |
| audit_logs         | id, actor_user_id, action, entity_type, entity_id, metadata_json, ip_hash, user_agent_hash, created_at                    | index(actor_user_id,created_at), index(entity_type,entity_id) | admin only                    |

## 8. RLS 策略摘要

- published course/unit/lesson/activity/exercise 可公開讀取。
- draft、pending_review、approved 未發布內容只允許 content_editor、reviewer、admin。
- learner 只能讀寫自己的 attempts、answers、progress、review_queue、writing、speaking、conversation。
- reviewer 可讀取審核所需內容，但不得看到不必要的使用者敏感資料。
- admin 可管理角色、feature flags、audit 與成本統計。
- service role 僅後端使用；前端永遠不用 service role。

## 9. Migration 要求

- migration 必須納入版本控制。
- enum 與 check constraint 需與 packages/validation 對齊。
- 所有 FK 需明確 on delete 策略。
- 重要查詢欄位建立索引。
- sensitive text 不寫入 logs；需保留摘要時使用 hash 或節錄。
