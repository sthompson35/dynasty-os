# Security Gate — RC-0.2.0

Status: **PASS with documented non-critical follow-ups.** No critical vulnerabilities in the code this RC actually ships. Written against the real, committed state on `charlie-panel-port` (based on `origin/main`), not a working-tree snapshot.

## What superseded this doc

`GO_LIVE_SECURITY_SUMMARY.md`, `NPM_SECURITY_AUDIT_REPORT.md`, `PYTHON_DEPENDENCY_SECURITY_ASSESSMENT.md`, and `PHASE_4_REMEDIATION_PLAN.md` (all generated 2026-07-03 by an autonomous agent) reported **9 vulnerabilities including 1 critical**, root-caused to `next-auth`. Investigation traced this to an **uncommitted** `frontend/package.json`/`package-lock.json` change that downgraded `next-auth` from `4.24.14` (the actual committed version, outside the vulnerable range) to `3.29.10` (vulnerable, pulls in `typeorm`/`jsonwebtoken`/`nodemailer` CVEs), alongside an unrelated jump to Next.js `^16.2.10`. That change was never deployed anywhere. It has been reverted (`git checkout -- frontend/package.json frontend/package-lock.json`). `PHASE_4_REMEDIATION_PLAN.md`'s 2-4 week remediation timeline is moot — it was written to fix a self-inflicted regression that no longer exists in the tree this RC is built from.

## Actual current state (verified via `npm audit --json` on the committed tree)

```
0 critical, 4 high, 15 moderate, 2 low — 21 total
```

All 21 require `npm audit fix --force` to resolve, which would pull in a Next.js 14→16 major version bump and a `next-auth` resolution change outside its stated range — the same category of blind major-version change that caused the original false-alarm regression. Not doing that again without a dedicated, tested upgrade pass.

| Severity | Package(s) | Notes |
|---|---|---|
| High | `next` | CVE tied to Next.js 14.2.x; fix requires the major-version bump above. |
| High | `js-cookie`, `react-use`, `lodash` | Transitive, pulled in via `react-use`; fix available (`react-use@17.6.1` / `lodash@4.18.1`) but not yet vetted for breaking changes in this app. |
| Moderate (×15) | `postcss`/`tailwindcss` build-toolchain chain (`postcss-*`, `autoprefixer`, `css-loader`, `icss-utils`), `next-auth`, `uuid` | Mostly build-time/dev-tooling, not runtime-exposed in production. |
| Low (×2) | `eslint`, `@eslint/plugin-kit` | Dev-only tooling. |

**Mitigation status:** none of these are in the vulnerable-and-actively-exploited category the original false alarm implied. They're tracked, not ignored — recommend scoping a dedicated Next.js 16 + next-auth upgrade pass (with full regression) as its own piece of work, not a blocker for this RC.

## Python backend

`PYTHON_DEPENDENCY_SECURITY_ASSESSMENT.md`'s claim of 0 vulnerabilities was not independently re-verified in this pass (no `pip audit` run) — flagging that gap rather than repeating an unverified claim.

## Verdict

Ship RC-0.2.0. Zero critical vulnerabilities in the actual committed dependency tree. The remaining 21 are tracked, mostly build-toolchain/dev-dependency, and require a deliberate major-version upgrade (Next.js 16) to close — scope that as a follow-up, not a gate.
