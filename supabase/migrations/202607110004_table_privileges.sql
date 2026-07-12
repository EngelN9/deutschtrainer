grant usage on schema public to anon, authenticated;

grant select on table
  public.courses,
  public.units,
  public.lessons,
  public.activities,
  public.exercises,
  public.exercise_options,
  public.exercise_answers,
  public.skills,
  public.grammar_topics,
  public.vocabulary
to anon, authenticated;

grant select, update on table public.profiles to authenticated;
grant select, insert, update, delete on table
  public.user_preferences,
  public.user_levels
to authenticated;

grant all privileges on table
  public.feature_flags,
  public.audit_logs,
  public.courses,
  public.units,
  public.lessons,
  public.activities,
  public.exercises,
  public.exercise_options,
  public.exercise_answers,
  public.skills,
  public.grammar_topics,
  public.vocabulary
to authenticated;

grant execute on function public.current_profile_id() to authenticated;
grant execute on function public.current_app_role() to authenticated;
grant execute on function public.is_content_team() to authenticated;
