# Seed Data

Phase 1 seed data initializes system feature flags.

Content seed data added from Phase 3 onward covers B1/B2/C1/C2 courses, skills, grammar topics,
vocabulary, writing/listening/speaking material, and exercises. The Phase 14 release seed targets
exactly 100 `human`／`approved`／`published` exercises with answer rows.

After a clean local reset, verify the release-seed contract with:

```powershell
pnpm --filter @deutschtrainer/api verify:content-readiness:local
```

The script and seed contents are repository evidence; a successful run against the current
database revision is still required before content readiness can pass.
