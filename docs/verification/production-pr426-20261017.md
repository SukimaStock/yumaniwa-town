# Production promotion of Staging PR #426 — 2026-10-17

## Authorization and frozen scope

User instruction: “PR #426をProductionに反映” (2026-10-17).
Production base: `b50d917e968350fb789fa0ffbec8f3941fcfc700`.
Source: merged Staging PR #426, commit `63613724`; implementation identical to staging generator at `ae68349784738af0fc14f9997acf9d4fe00dd13b`.
Plan Lock: `.change-plans/production-pr426-20261017/r0.lock.json`, committed before implementation (`5409a10`). Digest: `cabd8e2a9cd2e634b2c3a82b460fd0b2b7e4cd7eaae891086129dc61f31c398b`.

Exactly the 19-line campaign allowlist insertion is applied to the existing generator. Production generation targets the existing ten published IDs only: orbit,diorama-calendar,rojiura-masala,steamclock,dotweather,junkissa-dive,midnight-cola,yakitori-wars,rainy-window,pumpoko. Exactly 20 existing JA/EN pages are regenerated with `--env production` and the explicit current user instruction reference. No staging-only work or new page is promoted.

Existing play, town, and language links receive only nonempty `utm_source`, `utm_medium`, `utm_campaign`, `utm_content`, `utm_term` values. Fixed destinations and work identity, existing open=1 shortcut, JavaScript-free fallback, copy, styles, canonical/hreflang, schema, OGP, index robots and sitemap remain unchanged. Town shell and all work/runtime files are unchanged. SNS is untouched.

## Validation

- PASS: 60 Production-owned Node tests across campaign, release-validator and lifecycle suites (0 failures). Production has older/smaller release-validator/lifecycle tests than Staging's 118-test run; unrelated test/tooling changes are deliberately excluded.
- PASS: generator and campaign test Node syntax checks.
- PASS: Production generator `--check` with explicit ten-ID published set and user authorization reference.
- PASS: read-only Production release-validator, 1,489 PASS, 0 FAIL, 0 HQ_REQUIRED. Existing full-release external/manual checks remain unverified; its overall readiness field is not claimed as a new feature verification.
- PASS: exact-diff check reverses the single 19-line insertion and obtains byte-identical base generator and 20 pages, including metadata/styles/robots; sitemap is unchanged.
- Browser and Plan/Scope/Risk/Impact evidence are completed before handoff in this record.

## Limits and rollback

Physical iPhone Safari and SNS in-app browsers and external Plausible reports are unverified. Desktop/mobile browser coverage uses Chromium touch/viewport emulation.
Revert only this implementation commit to restore prior links and generated pages. Publication is authorized; deployed Pages SHA and live assets are verified separately after the remote PR is merged.
