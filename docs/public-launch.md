# Public launch handoff

## Status boundary

This document prepares the repository for a **public, cost-bounded verified beta**. It does not
claim that a domain has been purchased, DNS/TLS has been verified, Supabase redirect settings have
been applied, a provider has accepted real traffic, or that search engines have indexed the site.

## Public identity and domains

The intended public name is **DeutschTrainer AI — 德語 B1–C2 繁中學習平台**. Before paid promotion,
perform a basic trademark/name-conflict review: “Deutschtrainer” is also used by Goethe-Institut
and Deutsche Welle materials.

Use the following order only after registrar checkout confirms availability and renewal price:

1. `deutschtrainer.app`
2. `deutschtrainer-ai.app`
3. `deutschtrainer.tw`

For the selected base domain, attach the apex to the public/Admin Render service and `app.` to the
learner static Render service. Configure `www` as a permanent redirect to the apex. Do not add a
domain to Render or change `NEXT_PUBLIC_SITE_URL` / `NEXT_PUBLIC_LEARNER_WEB_URL` until the
registrar purchase, exact Render DNS records, TLS verification, and current Render hostname
allowance have all been checked. Keep both Render hostnames operational during the migration.

After both custom hosts verify, update API `CORS_ALLOWED_ORIGINS` to retain the Render origins and
add `https://<base-domain>` plus `https://app.<base-domain>`. Then set:

```text
NEXT_PUBLIC_SITE_URL=https://<base-domain>
NEXT_PUBLIC_LEARNER_WEB_URL=https://app.<base-domain>
```

Update Supabase Site URL and redirect allowlist with the custom learner origin and
`https://app.<base-domain>/reset-password`, then test a real recovery email and expired link.

## Public access modes

Anonymous visitors may use non-AI lessons. Paid AI and the Virtual Classroom always require a
confirmed-email `learner` identity. The default server settings remain fail-closed:

```text
AI_PUBLIC_ENABLED=false
AI_PUBLIC_ACCESS_MODE=allowlist
CLASSROOM_ENABLED=false
CLASSROOM_ACCESS_MODE=allowlist
```

Only after Supabase signup abuse protection/CAPTCHA, real-provider acceptance, two-user isolation,
and quota-exhaustion tests pass may an operator intentionally choose `verified_learners` and enable
the relevant kill switch. The AI platform cap remains ten provider calls per UTC day. Classroom
uses one five-minute session per learner in a rolling 24 hours and three sessions per platform UTC
day. A kill switch is the rollback: set the relevant `*_ENABLED=false`.

## Search discovery

The Next.js public site now produces canonical metadata, `zh-Hant`/`zh_TW` signals,
`SoftwareApplication` structured data, `/robots.txt`, and `/sitemap.xml`. The canonical origin is
the public `NEXT_PUBLIC_SITE_URL`, which deliberately falls back to the Render public-site hostname
until a custom domain has verified. The learner shell and `/classroom` receive `noindex,follow`;
search users should land on public descriptive pages instead.

After the canonical domain is live, inspect rendered canonical tags, robots, sitemap, HTTPS,
apex/`www` redirect behavior, and social previews. Verify ownership and submit the sitemap through
Google Search Console and Bing Webmaster Tools. Indexing is asynchronous and not guaranteed.

## Required acceptance before announcement

1. Confirm the merge SHA has successful CI and an actual deploy record for all three Render services.
2. Verify custom-domain TLS, CORS, Supabase redirect allowlist, anonymous entry, guest upgrade,
   recovery email, expired recovery link, and retained learning history.
3. Verify anonymous identities cannot call AI or Classroom endpoints; verify two distinct confirmed
   learners have independent quotas and cannot read one another's data.
4. Complete a real writing evaluation, clear 5–10 second speaking transcription, and one real
   five-minute Classroom session. Verify quota exhaustion, global caps, provider timeout, expiry
   sweep, and both kill switches.
5. Record monitoring, error/latency, provider usage/cost, and Render availability daily for the
   first seven days.

Until every applicable item is evidenced, describe the service only as a public, cost-bounded
verified beta or a restricted preview, as appropriate.
