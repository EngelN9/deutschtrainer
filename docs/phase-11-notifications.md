# Phase 11 Notification Preferences and Local Reminders

## Scope

Phase 11 implements the specification's user-controlled notification foundation without claiming a remote push service. It moves profile, onboarding, and notification preferences behind the authenticated API and adds timezone-aware local reminders in the Expo app.

## API Boundary

- `GET /users/me/settings` returns the authenticated learner's profile, learning setup, and notification preferences.
- `PUT /users/me/onboarding` atomically persists levels, daily minutes, learning goals, notification master switch, and onboarding completion.
- `PUT /users/me/notification-preferences` persists master/per-event switches, reminder time, inactivity interval, and IANA timezone.
- All responses pass independent Zod schemas and use private `no-store` responses.
- The shared per-profile sliding-window limiter covers settings together with learning, writing, and audio APIs.

## Database Security

- `complete_onboarding_service` and `update_notification_preferences_service` require `auth.role() = service_role`.
- authenticated loses direct insert/update privileges on `user_preferences` and `user_levels`, plus direct profile update.
- service role receives only the table reads needed by the settings repository; mutations remain inside security-definer functions.
- Database validation repeats level ordering, daily-minute, learning-goal, inactivity-day, and timezone checks.

## Mobile Behavior

- The settings screen exposes the master switch, daily/review/inactivity reminders, reminder time, 2/3/7/14-day inactivity interval, writing/new-course/goal event switches, timezone, and OS permission state.
- The scheduler creates 14 absolute date triggers from the saved timezone. One scheduled reminder is allowed per local date: inactivity replaces review, and review replaces a generic daily reminder.
- Scheduled identifiers are saved so a preference change or sign-out cancels the previous plan before replacement.
- Writing completion, newly observed published courses, and daily goal completion use a 30-day event ledger with stable keys.
- Notification taps deep-link to home, reviews, courses, or the relevant writing submission.
- Web uses an explicit no-op runtime. Native permission denial does not block onboarding or saving server preferences.

## Verification

- Clean Supabase migration reset and seed.
- Privilege audit: authenticated table writes and service-wrapper execution are false; service-role wrapper execution is true.
- Two-user integration: owner onboarding/preferences persist, the other learner stays unchanged, cross-user preference reads return zero rows, direct table write returns `403`, and direct service RPC returns `404`.
- Unit tests cover service owner scoping, contracts, timezone conversion, one-reminder-per-day behavior, precedence, and master disable.
- Mobile and API strict TypeScript checks pass, including native notification trigger types.

## Remaining Device Work

Remote push token registration, a server outbox, and background push dispatch are intentionally deferred. Before release, Android and iOS physical devices must verify permission allow/deny, OS delivery, notification taps, timezone changes, reboot behavior, and OEM battery restrictions.
