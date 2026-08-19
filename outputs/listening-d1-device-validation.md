# Listening D1 Android Device and Human Content Validation

## Result

`BLOCKED` for the current uncommitted source; the previously built Preview APK remains `FAIL`.

The internal-distribution EAS Preview APK installs and starts on the physical Android device. The
fixed human recording loads at 1:05, playback, pause, resume, replay, 0.75x, return to 1x, all four
questions, deterministic 100/100 grading, explanations, transcript rendering, and cold restart were
exercised. The user confirmed that 1x playback was clear and had no missing segment or clipping.

The previously built APK does not expose Listening through the required Demo navigation flow and
therefore remains a failed device artifact. On 2026-08-14, the current uncommitted source passed a
fresh local Web flow from the ordinary Demo navigation (`Home -> Listening -> D1`), including
playback controls, four-question grading, and reload behavior. This Web evidence validates the
source navigation fix but cannot replace a replacement APK and physical-device rerun.

The German B2+ human-review signature and explicit human confirmation that 0.75x has no abnormal
pitch are also still unavailable. The current D1 candidate is therefore `BLOCKED`, and this record
must not be used as production, store-release, or complete Definition of Done H evidence.

On 2026-08-12 the uncommitted source was corrected so the Demo navigation policy includes
`/audio-training` while continuing to hide Knowledge, Writing, and Analytics. Unit tests also prove
that Demo cannot enable the authenticated audio workspace and that the mock Preview rejects
connected auth before contacting Supabase. No replacement EAS build was authorized, so the tested
Build ID below still has the navigation failure and remains `FAIL`; source evidence is not a
substitute for rerunning the physical-device flow.

## Evidence identity

| Field | Value |
| --- | --- |
| Date | 2026-08-11 (Asia/Taipei) |
| Branch | `codex/listening-d1` |
| Base commit | `cae65eacce839e0b5f65b630c10c876e3c3790ff` |
| Working tree | Dirty by design; Listening D1 and validation evidence remain uncommitted |
| App version | `0.1.1` |
| Android package | `com.deutschtrainer.app` |
| Android versionCode | `3` |
| EAS profile / distribution | `preview` / internal |
| EAS CLI | `21.7.1` |
| EAS Build ID | `507c2316-bacc-4a78-b740-f557c4217797` |
| EAS build status / completed at | `FINISHED` / `2026-08-11T12:36:08.558Z` |
| EAS SDK / fingerprint | `57.0.0` / `6c7681a6c70efcd41ee3efa1fd54dc007ef59ee9` |
| Test host | Standalone EAS Preview APK; not Expo Go and not a store build |
| Device manufacturer/model | realme RMX3661 |
| Android version / SDK level | Android 15 / SDK 35 |
| Installed package evidence | `versionName=0.1.1`, `versionCode=3`, target SDK 36 |

The EAS metadata reports the base Git commit because the source files were uncommitted. The hashes
below identify the actual dirty source and artifact used in this validation. This APK is not a
reproducible release candidate.

## Artifact hashes

| Artifact | SHA-256 |
| --- | --- |
| `apps/mobile/assets/audio/365-euro-ticket.mp3` | `4A05EA821D2893456435A67C41D21F2D4BAB9419C2928808A4D5E29206E5D07B` |
| `apps/mobile/src/features/audio-learning/listeningD1.ts` | `973A90E52C7B4D271AA739C53A75A7BEF8CC4F7894554B47B30152ABCD5CB6A7` |
| `apps/mobile/src/features/audio-learning/ListeningD1Practice.tsx` | `D1B95E689C3DBFC96BD2A3DFE749FED3403E4F621F8A9869F4BF2CAEE4BE2FDA` |
| `apps/mobile/src/features/audio-learning/listeningD1Audio.ts` | `835EB7E0F73ADD007116B67966DC790E5DFCEECBF5BFBCE03D983282822761CB` |
| `apps/mobile/src/features/audio-learning/listeningD1.test.ts` | `07924F968AC3020E3BF35C1317A676A6E226720AAA37188241EE80B10269286A` |
| EAS Preview APK | `FAAC00AA6BAE0A6435F66EAB30CF9750F3ACD9292DF0A673B99D9E9EE18568B5` |
| `outputs/listening-d1-replay.png` | `748ADC9EA16B1E7D0CE6D9B58370592C7052CC663CA1D5E5F80F03203C3D1F2A` |
| `outputs/listening-d1-slow.png` | `E8C4ACA83A97799ECC433DB9E18EC4AB02A6EEBE47B2966AB8F3968000CFC237` |
| `outputs/listening-d1-normal-playing.png` | `C16B14EDB495073A0765A8D39AA029DAB3B6D3104AA8438EBC902F632A27252A` |
| `outputs/listening-d1-result-after-restart.png` | `B5D2BA04CFED64C060333ADBCC40C5C246EBAC09218DB6179BBADC1CD72A1D14` |

The downloaded APK is 113,558,966 bytes and contains 1,664 ZIP entries, including
`AndroidManifest.xml`, `classes.dex`, arm64-v8a libraries, and armeabi-v7a libraries. The local APK
was downloaded to the Windows temporary directory and is not part of the repository.

## Android physical-device checklist

| Check | Status | Evidence / result |
| --- | --- | --- |
| USB debugging authorized; device reported as `device` | PASS | Authorized realme RMX3661 reported by ADB; device serial intentionally omitted |
| Standalone Preview APK installs and boots | PASS | `adb install -r` returned `Success`; launcher is `com.deutschtrainer.app/.MainActivity` |
| Cold start preserves the Demo session | PASS | After package force-stop and cold start, `你好，Demo 學習者` was visible and the welcome screen was absent |
| Open Demo and reach Listening D1 through user navigation | FAIL | Demo `MainNavigation` filters out `/audio-training`; only Home, Courses, and Review are visible |
| Diagnostic deep link opens the existing D1 route | PASS | `deutschtrainer://audio-training` opened the D1 list, and the D1 card opened successfully; this does not waive the navigation failure |
| Current uncommitted source exposes Demo Listening without connected workspaces | PASS | Navigation/access policy unit tests pass; a replacement APK has not been built or installed |
| Four vocabulary supports and fixed-human-audio disclosure render | PASS | All four terms and the no-AI/TTS/STT disclosure were visible on device |
| Fixed human audio loads with approximately 1:06 duration | PASS | Native player reported `1:05`, within the expected approximate duration |
| 1x playback is audible, complete, and free of clipping | PASS | Timeline advanced to the end; the user confirmed clear audio with no missing segment or clipping |
| Pause stops audio and preserves position | PASS | Playback paused at 0:38 and later at 0:28/0:30 without resetting position |
| Resume continues from the paused position | PASS | Playback continued from the retained position and reached 1:05 |
| Replay seeks to the beginning and increments play count | PASS | Screenshot shows active playback at 0:01 after replay; play count increased |
| 0.75x functional switch | PASS | Screenshot and accessibility state show 0.75x active while playback advanced |
| 0.75x is intelligible and without abnormal pitch | BLOCKED | Requires explicit human confirmation; device state cannot establish perceptual quality |
| Switching back to 1x works | PASS | While playing, 1x became active; the player then paused at 0:30 with 1x still selected |
| Four questions are reachable and selectable | PASS | All twelve options across four questions were visible and operable |
| Submit remains disabled until all four answers are selected | PASS | `enabled=false` before completion and `enabled=true` after the fourth selection |
| Deterministic score, explanations, and transcript render | PASS | Correct answers produced 100 points, 4/4, all four explanations, and the full transcript |
| Force-stop/reopen allows the Demo session and D1 to reopen | PARTIAL | Demo session persists and the deep link reopens D1, but ordinary Demo navigation still cannot reach Listening |
| Reopened D1 resets local play count, answers, and result | PASS | D1 reopened with play count 0, no result, visible answers unchecked, and a second identical submission again produced 100/100 |

## Local Web source validation (2026-08-14)

This section validates the current uncommitted source at `http://localhost:8081`. It is browser
evidence only and does not change the failed navigation result of EAS Build ID
`507c2316-bacc-4a78-b740-f557c4217797`.

| Check | Status | Evidence / result |
| --- | --- | --- |
| Demo ordinary navigation exposes exactly Home, Courses, Listening, and Review | PASS | Demo home rendered the four expected tabs and did not expose Knowledge, Writing, or Analytics |
| Reach D1 without a deep link | PASS | Clicking `Listening` opened `/audio-training`; clicking the D1 card opened `/listening/7bdc1dd6-8f39-4cb9-a5f3-c0d3a4270031` |
| Vocabulary, fixed-human-audio disclosure, and attribution render | PASS | Four vocabulary supports, the no-AI/TTS/STT disclosure, creator/source/license text, and the source link were visible |
| 1x playback and duration | PASS | Playback advanced, the control changed to Pause, play count increased, and duration rendered as 1:05 |
| Pause and resume | PASS | The displayed position remained 0:19 across a three-second paused interval; playback then resumed |
| 0.75x functional switch and return to 1x | PASS | The slow control received the selected visual state, playback advanced, and the normal control could be selected again |
| 0.75x perceptual quality | BLOCKED | Browser state proves the rate control is active but cannot prove intelligibility or absence of abnormal pitch |
| Replay | PASS | Replay reset the displayed position to 0:00 and increased play count to 3 |
| Four-question submission gate | PASS | Submit was disabled at zero and three answers, then enabled after the fourth answer |
| Deterministic grading and explanations | PASS | Correct answers produced 100 points, 4/4, four Traditional Chinese explanations, and the transcript |
| Reload behavior | PASS | Reload kept the Demo route accessible and reset play count, answers, and result as designed |
| Authenticated request isolation | PASS | Unit tests verify Demo cannot enable the authenticated audio workspace or connected authentication |

## Human content QA

### Static review completed

| Check | Status | Evidence / result |
| --- | --- | --- |
| Audio source and license metadata | PASS | Wikimedia Commons source identifies a human-spoken recording under CC BY 2.5 |
| Repository attribution | PASS | Title, creator, source, license, and no local modification are documented beside the asset and in the UI |
| German transcript and published article alignment | PASS | Dates, figures, places, and reported proposal align with the published Wikinews text |
| Traditional Chinese script | PASS | Prompts, options, supports, and explanations use Traditional Chinese |
| Single-answer integrity | PASS | Each of the four fixed questions has one schema-validated answer |
| B1 scaffolding contract | PASS | Four unique pre-listening vocabulary supports are schema-validated |

### Required human signature

| Field | Value |
| --- | --- |
| Reviewer role / identifier | `BLOCKED` - German B2+ human reviewer has not supplied a signed result |
| Review date | `BLOCKED` |
| 1x listening assessment | User device listener confirmed clear playback with no missing segment or clipping; this is not the B2+ language review |
| 0.75x listening assessment | `BLOCKED` - explicit clarity and pitch confirmation not yet supplied |
| Audio-to-transcript comparison | NOT RUN |
| Scaffolded B1 suitability | NOT RUN |
| Question and explanation approval | NOT RUN |
| Final human-content decision | `BLOCKED` |

The German B2+ reviewer must listen before reading the transcript, repeat at 0.75x, compare the full
recording with the transcript, and sign the CEFR, question, distractor, and Traditional Chinese
explanation checklist. Automated schema tests, device automation, and Codex static review do not
replace this step.

## Screenshot evidence

| File | Evidence |
| --- | --- |
| `outputs/listening-d1-replay.png` | 1x selected, active playback at 0:01 after replay |
| `outputs/listening-d1-slow.png` | 0.75x selected while playback advanced |
| `outputs/listening-d1-normal-playing.png` | 1x selected again during playback |
| `outputs/listening-d1-result-after-restart.png` | Restarted D1 produced 100 points, 4/4, and transcript output |

## Audio policy

- D1 keeps the existing legally reusable human recording.
- D1 and any later D2 must not use AI-generated voice, TTS, STT, or Conversation features.
- D2 planning remains blocked until every required D1 device and human-review row passes.

## Commands and automated evidence

| Command | Status | Result |
| --- | --- | --- |
| `adb devices -l` | PASS | Authorized physical device reported as `device`; serial omitted |
| EAS CLI identity and project inspection | PASS | Authenticated account and the existing EAS project were confirmed; personal account details are intentionally omitted |
| `npx --yes eas-cli@latest build --platform android --profile preview --non-interactive --wait` | PASS | Build ID `507c2316-bacc-4a78-b740-f557c4217797` finished; no submit command was used |
| APK ZIP structure and SHA-256 check | PASS | Manifest, dex, and Android native ABIs present; hash recorded above |
| `adb install -r` | PASS | Streamed install returned `Success`; no uninstall or data clear was needed |
| Mobile D1/mode targeted Jest | PASS | Fresh 2026-08-19: 6 suites, 14 tests covering D1, build capabilities, navigation, auth boundaries, and authenticated audio access |
| Mobile typecheck | PASS | Fresh 2026-08-19: repository typecheck included Mobile and exited 0 |
| Local Web ordinary navigation and D1 browser flow | PASS | Fresh 2026-08-14: Demo navigation, playback controls, four-answer gate, 100/100 result, and reload reset verified at localhost |
| Exact root `pnpm test` with the preserved nested worktree present | FAIL | Jest sees duplicate workspace package names under ignored local path `work/web-five-skills-beta`; the worktree was not deleted or modified because it contains preserved uncommitted work |
| `pnpm format:check` | PASS | Fresh 2026-08-19: all matched files use Prettier code style |
| `pnpm lint` | PASS | Fresh 2026-08-19: ESLint exited 0 |
| `pnpm typecheck` | PASS | Fresh 2026-08-19: 12 of 13 workspace projects passed |
| Full Jest with one-time local worktree exclusion | PASS | Fresh 2026-08-19: 34 suites, 171 tests; the exclusion affects only the preserved nested worktrees |
| `pnpm exec expo install --check` from `apps/mobile` | PASS | Fresh 2026-08-19: Expo SDK 57 dependencies are up to date after patch alignment |
| Expo Doctor 1.20.2 | PASS | Fresh 2026-08-19: 21/21 checks passed |
| Mobile Android export | PASS | Fresh 2026-08-19: export completed and includes the 1.2 MB D1 MP3 |
| Mobile Web export | PASS | Fresh 2026-08-19: export completed and includes the hashed 1.2 MB D1 MP3 |
| Connected fixture Web export with cleared Metro cache | PASS | Fresh 2026-08-12: bundle contains fixture HTTPS API/Supabase URLs and no localhost API; this is build evidence only, not staging acceptance |

Expo patch metadata initially reported several SDK 57 patch mismatches and Expo Doctor found a
nested duplicate `expo-constants`. The working tree now aligns the affected Expo package patches,
records the lockfile changes, and pins the compatible `expo-constants` version through the workspace
override. The full quality gates and Android export passed again after that change.

## Diagnostic history retained for transparency

- The earlier Expo Go attempt reached the App's `expo-notifications` compatibility error before
  routing. The standalone Preview APK includes the native notification module and boots normally.
- The realme installation flow briefly displayed an OEM post-install recommendation screen. It was
  exited with Back; no recommended application was installed.
- Demo mode itself persists across cold restart, but the tested APK filters the Listening route out
  of Demo `MainNavigation`. The current uncommitted source corrects the policy, but the deep link and
  source tests are not acceptable replacements for a new user-visible device run.
- UIAutomator waits for an idle accessibility tree while the timeline changes, so screenshots and
  stable paused states were used for rate and replay evidence rather than treating stale dumps as
  proof.

## Next minimum action

After explicit authorization, build a replacement Preview APK and rerun the ordinary
`Demo -> Listening -> D1` flow without exposing connected listening or speaking features. Obtain an
explicit 0.75x perceptual confirmation and a German B2+ human-review signature. Do not plan D2,
commit, push, create a PR, deploy, submit to a store, or claim complete Definition of Done H before
those gates pass.
