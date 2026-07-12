insert into public.feature_flags (key, description, enabled)
values
  ('ai_evaluation_enabled', 'Enable AI evaluation endpoints for controlled environments.', false),
  ('offline_attempt_sync_enabled', 'Enable offline attempt sync queue.', false)
on conflict (key) do update
set
  description = excluded.description,
  enabled = excluded.enabled,
  updated_at = now();
