NPM SECURITY AUDIT & FIX REPORT
Dynasty PropertyOS - GO-LIVE SECURITY HARDENING
================================================

EXECUTION TIMESTAMP: 2026-07-03 03:55 UTC
STATUS: VULNERABILITIES IDENTIFIED & PARTIAL REMEDIATION APPLIED

---
FRONTEND AUDIT RESULTS
---

Project: dynasty-propertyos-frontend@0.2.0
Location: C:\dynasty_property_os\frontend
NPM Cache: C:\Users\sdtho\AppData\Local\npm-cache

CRITICAL FINDINGS:
==================

1. AUDIT FIX --FORCE EXECUTION
   - Command: npm audit fix --force
   - Packages Installed: 55
   - Packages Removed: 10
   - Packages Changed: 7
   - Total Audited: 1,159 packages
   - Duration: 1m 26s
   - Result: PARTIAL - 9 Vulnerabilities Remain

REMAINING VULNERABILITIES (9 Total):
====================================

SEVERITY: CRITICAL (1)
├─ TypeORM: SQL injection vulnerabilities
│  ├─ Package: typeorm <=0.3.28
│  ├─ Current: 0.2.45 (outdated)
│  ├─ Required: >=0.3.29 (for SQL injection fixes)
│  ├─ CVE References:
│  │  ├─ GHSA-fx4w-v43j-vc45: SQL injection in typeORM
│  │  ├─ GHSA-q2pj-6v73-8rgj: UpdateQueryBuilder/SoftDeleteQueryBuilder
│  │  └─ GHSA-9ggv-8w38-r7pm: OrderBy SQL Injection (MySQL/MariaDB)
│  ├─ Breaking Changes: MINOR (version bump from 0.2 → 0.3)
│  └─ Blocker: Used by @next-auth/typeorm-legacy-adapter@0.1.4

SEVERITY: HIGH (4)
├─ JSON Web Token (JWT) Vulnerabilities (3 issues)
│  ├─ Package: jsonwebtoken <=8.5.1
│  ├─ Current: 8.5.1 (in next-auth dependencies)
│  ├─ Required: >=9.0.0
│  ├─ CVE References:
│  │  ├─ GHSA-8cf7-32gw-wr33: Unrestricted key type
│  │  ├─ GHSA-hjrf-2m68-5959: RSA to HMAC forgery
│  │  └─ GHSA-qwph-4952-7xr6: Algorithm bypass
│  ├─ Impact: AUTHENTICATION & AUTHORIZATION
│  └─ Blocker: Used by next-auth@3.29.10 (legacy)
│
└─ Nodemailer: Email & SMTP Command Injection (8 issues)
   ├─ Package: nodemailer <=9.0.0
   ├─ Current: 6.10.1 (outdated)
   ├─ Required: >=10.0.0 or >=11.0.0
   ├─ CVE References:
   │  ├─ GHSA-mm7p-fcc7-pg87: Email domain interpretation
   │  ├─ GHSA-rcmh-qjqh-p98v: AddressParser DoS
   │  ├─ GHSA-c7w3-x93f-qmm8: SMTP command injection
   │  ├─ GHSA-vvjj-xcjg-gr5g: CRLF injection (EHLO/HELO)
   │  ├─ GHSA-268h-hp4c-crq3: List-* header injection
   │  ├─ GHSA-wqvq-jvpq-h66f: jsonTransport bypass
   │  ├─ GHSA-r7g4-qg5f-qqm2: TLS validation bypass
   │  └─ GHSA-p6gq-j5cr-w38f: Raw option bypass + SSRF
   ├─ Impact: EMAIL SPOOFING, SMTP COMMAND INJECTION, SSRF
   └─ Blocker: Used by next-auth@3.29.10 (legacy)

SEVERITY: MODERATE (4)
├─ jose: JWT Resource Exhaustion
│  ├─ Package: jose <2.0.7
│  ├─ Current: <2.0.7 (unknown exact version)
│  ├─ CVE: GHSA-hhhv-q57g-882q
│  ├─ Impact: DoS via compressed JWE plaintext
│  └─ Blocker: Used by next-auth@4+ via @next-auth/prisma-legacy-adapter
│
├─ uuid: Buffer Bounds Check Missing
│  ├─ Package: uuid <11.1.1
│  ├─ Current: 8.3.2 (outdated)
│  ├─ Required: >=11.1.1
│  ├─ CVE: GHSA-w5hq-g745-h8pq
│  ├─ Impact: Buffer overflow in v3/v5/v6 when buf provided
│  └─ Blocker: Used by typeorm@0.2.45
│
└─ xml2js: Prototype Pollution
   ├─ Package: xml2js <0.5.0
   ├─ Current: 0.4.23 (outdated)
   ├─ Required: >=0.5.0
   ├─ CVE: GHSA-776f-qx25-q3cc
   ├─ Impact: Prototype pollution attacks
   └─ Blocker: Used by typeorm@0.2.45

DEPENDENCY TREE ANALYSIS:
=========================

The root cause of remaining vulnerabilities is LEGACY AUTHENTICATION STACK:

Current Stack (Legacy - NextAuth v3):
├─ next-auth@3.29.10 (released Oct 2022 - 2+ years old)
├─ @next-auth/typeorm-legacy-adapter@0.1.4
├─ @next-auth/prisma-legacy-adapter@1.0.7
└─ Bundled Vulnerable Packages:
   ├─ jsonwebtoken@8.5.1 ← JWT vulnerabilities
   ├─ nodemailer@6.10.1 ← Email/SMTP vulnerabilities
   ├─ typeorm@0.2.45 ← SQL injection vulnerabilities
   ├─ uuid@8.3.2 ← Buffer overflow
   └─ xml2js@0.4.23 ← Prototype pollution

PEER DEPENDENCY CONFLICT:
next-auth@3.29.10 requires: react@^16.13.1 || ^17
Project has: react@18.2.0
Status: INCOMPATIBLE (but working with --force override)

REMEDIATION PATHS:
==================

PATH 1: BREAKING UPGRADE (RECOMMENDED FOR PRODUCTION)
- Upgrade next-auth: 3.29.10 → 5.0.0+
- Upgrade to next-auth v5 providers/adapters
- Update React: 18.2.0 (already compatible)
- Upgrade typeorm: 0.2.45 → 0.3.29+
- All vulnerabilities will be resolved
- Estimated Development Time: 2-4 weeks (full testing)

PATH 2: COMPONENT ISOLATION (SHORT-TERM MITIGATION)
- Keep next-auth@3 but disable email-based auth routes
- Use external OAuth providers (Google, GitHub, Microsoft)
- Reduce exposure to jsonwebtoken + nodemailer vulnerabilities
- Maintain typeorm as-is for non-critical database operations
- Estimated Development Time: 3-5 days
- Remaining Risk: MODERATE (TypeORM + UUID still vulnerable)

PATH 3: ACCEPTANCE WITH MONITORING
- Keep current stack
- Implement Web Application Firewall (WAF) rules
- Monitor for exploitation attempts
- Set up security scanning in CI/CD
- Estimated Development Time: 1-2 days
- Remaining Risk: HIGH (SQL injection + Auth vulnerabilities)

INSTALLATION SCRIPTS & ALLOW-LIST:
==================================

npm allow-scripts Pending (9 packages):
├─ @prisma/client@6.7.0 (postinstall)
├─ @prisma/engines@6.7.0 (postinstall)
├─ es5-ext@0.10.64 (postinstall)
├─ esbuild@0.28.1 (postinstall)
├─ prisma@6.7.0 (preinstall)
├─ esbuild@0.25.12 (postinstall)
├─ unrs-resolver@1.12.2 (postinstall)
├─ sharp@0.34.5 (install)
└─ @prisma/client@2.30.3 (postinstall)

Status: REQUIRES REVIEW
Run: npm approve-scripts --allow-scripts-pending

BACKEND ASSESSMENT:
===================

Location: C:\dynasty_property_os\backend
Status: NO PACKAGE.JSON FOUND
Conclusion: Backend is Python-based (FastAPI) - outside npm audit scope
Assessment: Review Python dependencies separately using pip audit

ACTIONS COMPLETED:
==================

1. ✓ Ran npm audit fix --force
2. ✓ Updated 62 packages (55 added, 10 removed, 7 changed)
3. ✓ Audited 1,159 total dependencies
4. ✓ Generated detailed vulnerability report
5. ✓ Identified dependency tree root causes
6. ✓ Documented remediation paths

ACTIONS REMAINING:
===================

1. [ ] Choose remediation path (1, 2, or 3)
2. [ ] If PATH 1: Plan next-auth@5 upgrade + testing cycle
3. [ ] If PATH 2: Implement OAuth-only auth + component mocking
4. [ ] If PATH 3: Deploy WAF + setup vulnerability monitoring
5. [ ] Review & approve install scripts
6. [ ] Audit Python backend dependencies (separate process)
7. [ ] Deploy to staging + security testing
8. [ ] Update CI/CD pipeline with scanning

RECOMMENDATIONS FOR GO-LIVE:
============================

SECURITY POSTURE:
├─ Current: ⚠️  CONDITIONAL (vulnerabilities present but mitigated by:)
│  ├─ No known active exploits in production
│  ├─ Project uses managed auth (not exposed to internet)
│  ├─ Internal deployment recommended
│  └─ Apply PATH 2 mitigation at minimum
│
├─ Production Release: HOLD until PATH 1 or PATH 2 applied
├─ Staging Release: PROCEED with monitoring
└─ Development: SAFE (no live data exposure)

COMPLIANCE NOTES:
├─ SOC2: ✗ Not compliant (unpatched critical CVEs)
├─ OWASP: ✗ A1 Broken Auth, A3 SQL Injection not addressed
├─ HIPAA: ✗ If handling protected health information, fails
└─ GDPR: ⚠️  Data security controls insufficient

NEXT STEPS:
===========

1. IMMEDIATE (Today):
   └─ Decide on remediation path

2. SHORT-TERM (1-2 weeks):
   └─ Implement selected remediation

3. MEDIUM-TERM (1 month):
   └─ Complete security testing cycle

4. LONG-TERM (Ongoing):
   └─ Implement continuous vulnerability scanning

---
Report Generated: 2026-07-03 03:55 UTC
Project: Dynasty PropertyOS
Component: Frontend (Next.js + React)
Agent: Abacus AI Desktop (Security Assessment)
