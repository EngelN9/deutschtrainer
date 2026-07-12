create type public.content_status as enum (
  'draft',
  'pending_review',
  'approved',
  'published',
  'rejected',
  'archived'
);
create type public.skill_category as enum (
  'vocabulary',
  'grammar',
  'reading',
  'listening',
  'writing',
  'speaking',
  'interaction',
  'mediation',
  'pronunciation',
  'exam_preparation'
);
create type public.activity_type as enum ('instruction', 'practice', 'review', 'quiz', 'task');
create type public.exercise_type as enum (
  'multiple_choice',
  'multiple_select',
  'fill_blank',
  'sentence_order',
  'matching',
  'translation',
  'dictation',
  'error_correction',
  'reading_comprehension',
  'listening_comprehension',
  'free_response',
  'speaking',
  'conversation',
  'essay',
  'summary',
  'paraphrase',
  'argumentation',
  'mediation',
  'oral_presentation'
);
create type public.source_type as enum ('human', 'ai_generated', 'ai_assisted');
create type public.review_status as enum ('draft', 'pending_review', 'approved', 'rejected');

create or replace function public.is_content_team()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(public.current_app_role() in ('content_editor', 'reviewer', 'admin'), false)
$$;

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  level public.cefr_level not null,
  title_zh_tw text not null,
  title_de text not null,
  description_zh_tw text not null,
  status public.content_status not null default 'draft',
  version integer not null default 1 check (version > 0),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index courses_level_status_idx on public.courses(level, status) where deleted_at is null;

create table public.units (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title_zh_tw text not null,
  title_de text not null,
  description_zh_tw text not null default '',
  order_index integer not null check (order_index >= 0),
  status public.content_status not null default 'draft',
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (course_id, order_index)
);

create index units_course_status_idx on public.units(course_id, status) where deleted_at is null;

create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references public.units(id) on delete cascade,
  level public.cefr_level not null,
  title_zh_tw text not null,
  title_de text not null,
  order_index integer not null check (order_index >= 0),
  estimated_minutes integer not null check (estimated_minutes between 1 and 240),
  skill_categories public.skill_category[] not null default '{}'::public.skill_category[],
  prerequisite_skill_ids text[] not null default '{}',
  learning_objectives text[] not null,
  vocabulary_tags text[] not null default '{}',
  grammar_tags text[] not null default '{}',
  cefr_descriptor text not null,
  status public.content_status not null default 'draft',
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  check (cardinality(learning_objectives) between 1 and 3),
  unique (unit_id, order_index)
);

create index lessons_unit_status_idx on public.lessons(unit_id, status) where deleted_at is null;
create index lessons_level_idx on public.lessons(level) where deleted_at is null;

create table public.activities (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  type public.activity_type not null,
  title_zh_tw text not null,
  order_index integer not null check (order_index >= 0),
  content_json jsonb not null default '{}'::jsonb,
  status public.content_status not null default 'draft',
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (lesson_id, order_index)
);

create index activities_lesson_status_idx on public.activities(lesson_id, status) where deleted_at is null;

create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.activities(id) on delete cascade,
  level public.cefr_level not null,
  type public.exercise_type not null,
  title text not null,
  instruction_zh_tw text not null,
  prompt_de text not null,
  payload_json jsonb not null default '{}'::jsonb,
  skill_ids text[] not null default '{}',
  grammar_topic_ids text[] not null default '{}',
  vocabulary_ids text[] not null default '{}',
  estimated_seconds integer not null check (estimated_seconds between 1 and 3600),
  difficulty integer not null check (difficulty between 1 and 5),
  source_type public.source_type not null default 'human',
  review_status public.review_status not null default 'draft',
  status public.content_status not null default 'draft',
  version integer not null default 1 check (version > 0),
  order_index integer not null check (order_index >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  unique (activity_id, order_index)
);

create index exercises_activity_idx on public.exercises(activity_id, order_index) where deleted_at is null;
create index exercises_type_level_status_idx on public.exercises(type, level, status) where deleted_at is null;
create index exercises_payload_gin_idx on public.exercises using gin(payload_json);

create table public.exercise_options (
  id uuid primary key default gen_random_uuid(),
  exercise_id uuid not null references public.exercises(id) on delete cascade,
  label text not null,
  text_de text not null,
  text_zh_tw text,
  order_index integer not null check (order_index >= 0),
  is_correct boolean not null default false,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (exercise_id, order_index)
);

create index exercise_options_exercise_idx on public.exercise_options(exercise_id, order_index);

create table public.exercise_answers (
  id uuid primary key default gen_random_uuid(),
  exercise_id uuid not null unique references public.exercises(id) on delete cascade,
  answer_json jsonb not null,
  grading_policy_json jsonb not null default '{}'::jsonb,
  explanation_zh_tw text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.skills (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name_zh_tw text not null,
  name_de text not null,
  description_zh_tw text not null,
  level public.cefr_level not null,
  category public.skill_category not null,
  mastery_threshold numeric(5, 2) not null default 80 check (mastery_threshold between 0 and 100),
  prerequisite_skill_ids text[] not null default '{}',
  review_policy_json jsonb not null default '{}'::jsonb,
  status public.content_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index skills_level_category_idx on public.skills(level, category);

create table public.grammar_topics (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  title_zh_tw text not null,
  title_de text not null,
  level public.cefr_level not null,
  short_explanation_zh_tw text not null,
  full_explanation_zh_tw text not null,
  rules_json jsonb not null default '[]'::jsonb,
  examples_json jsonb not null default '[]'::jsonb,
  common_mistakes_json jsonb not null default '[]'::jsonb,
  related_skill_ids text[] not null default '{}',
  prerequisite_topic_ids text[] not null default '{}',
  difficulty integer not null check (difficulty between 1 and 5),
  status public.content_status not null default 'draft',
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index grammar_topics_level_status_idx on public.grammar_topics(level, status);

create table public.vocabulary (
  id uuid primary key default gen_random_uuid(),
  lemma text not null,
  part_of_speech text not null,
  gender text,
  plural text,
  principal_parts_json jsonb not null default '[]'::jsonb,
  separable_prefix text,
  reflexive boolean not null default false,
  governing_case text,
  required_preposition text,
  level public.cefr_level not null,
  frequency_rank integer,
  definitions_zh_tw text[] not null,
  example_sentences text[] not null default '{}',
  collocations_json jsonb not null default '[]'::jsonb,
  synonyms_json jsonb not null default '[]'::jsonb,
  antonyms_json jsonb not null default '[]'::jsonb,
  register text not null default 'neutral',
  region text not null default 'general',
  audio_url text,
  status public.content_status not null default 'draft',
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (level, lemma)
);

create index vocabulary_level_lemma_idx on public.vocabulary(level, lemma);
create index vocabulary_part_of_speech_idx on public.vocabulary(part_of_speech);

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'courses',
    'units',
    'lessons',
    'activities',
    'exercises',
    'exercise_options',
    'exercise_answers',
    'skills',
    'grammar_topics',
    'vocabulary'
  ]
  loop
    execute format(
      'create trigger %I_set_updated_at before update on public.%I for each row execute function public.set_updated_at()',
      table_name,
      table_name
    );
    execute format('alter table public.%I enable row level security', table_name);
    execute format(
      'create policy %I on public.%I for all to authenticated using (public.is_content_team()) with check (public.is_content_team())',
      'content team manages ' || table_name,
      table_name
    );
  end loop;
end;
$$;

create policy "published courses are readable"
on public.courses for select to anon, authenticated
using (status = 'published' and deleted_at is null);

create policy "published units are readable"
on public.units for select to anon, authenticated
using (
  status = 'published'
  and deleted_at is null
  and exists (
    select 1 from public.courses
    where courses.id = units.course_id
      and courses.status = 'published'
      and courses.deleted_at is null
  )
);

create policy "published lessons are readable"
on public.lessons for select to anon, authenticated
using (
  status = 'published'
  and deleted_at is null
  and exists (
    select 1 from public.units
    where units.id = lessons.unit_id
      and units.status = 'published'
      and units.deleted_at is null
  )
);

create policy "published activities are readable"
on public.activities for select to anon, authenticated
using (
  status = 'published'
  and deleted_at is null
  and exists (
    select 1 from public.lessons
    where lessons.id = activities.lesson_id
      and lessons.status = 'published'
      and lessons.deleted_at is null
  )
);

create policy "approved published exercises are readable"
on public.exercises for select to anon, authenticated
using (
  status = 'published'
  and review_status = 'approved'
  and deleted_at is null
  and exists (
    select 1 from public.activities
    where activities.id = exercises.activity_id
      and activities.status = 'published'
      and activities.deleted_at is null
  )
);

create policy "published exercise options are readable"
on public.exercise_options for select to anon, authenticated
using (
  exists (
    select 1 from public.exercises
    where exercises.id = exercise_options.exercise_id
      and exercises.status = 'published'
      and exercises.review_status = 'approved'
      and exercises.deleted_at is null
  )
);

create policy "published exercise answers are readable"
on public.exercise_answers for select to anon, authenticated
using (
  exists (
    select 1 from public.exercises
    where exercises.id = exercise_answers.exercise_id
      and exercises.status = 'published'
      and exercises.review_status = 'approved'
      and exercises.deleted_at is null
  )
);

create policy "published skills are readable"
on public.skills for select to anon, authenticated
using (status = 'published');

create policy "published grammar topics are readable"
on public.grammar_topics for select to anon, authenticated
using (status = 'published');

create policy "published vocabulary is readable"
on public.vocabulary for select to anon, authenticated
using (status = 'published');
