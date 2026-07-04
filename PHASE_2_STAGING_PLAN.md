PHASE 2 STAGING & OAUTH-ONLY VERIFICATION
Dynasty PropertyOS Frontend - Staging Deployment
===============================================

DEPLOYMENT DECISION: APPROVED FOR STAGING ONLY
Date: 2026-07-03
Authority: @ARCHITECT
Status: PENDING Phase 1 Completion
Hold Gate: CONDITIONAL - OAuth-only verification required before Phase 3

==============================================
PHASE 2: FRONTEND STAGING DEPLOYMENT
==============================================

Timeline: After Phase 1 backend is LIVE (T+1 hour to T+24 hours)
Scope: Deploy frontend to staging.dynasty-os.internal ONLY
No Production Deployment Until Security Sign-Off

PREREQUISITE: Phase 1 Backend LIVE
├─ [ ] Backend API online at https://api.dynasty-os.internal:8000
├─ [ ] Health check passing: GET /health → {"ok": true}
├─ [ ] Land+Build endpoints responding
└─ [ ] Monitoring & alerting active

==============================================
STEP 1: FRONTEND BUILD FOR STAGING
==============================================

Commands:
```bash
cd C:\dynasty_property_os\frontend

# Install dependencies (use --legacy-peer-deps due to next-auth v3)
npm install --legacy-peer-deps

# Build frontend
npm run build

# Verify build output
ls -la .next/

# Check build size (should be < 5MB for core bundle)
du -sh .next/
```

Expected Output:
```
ready - compiled client and server successfully
Generated static files: 1,234 pages
Pages generated at T+30s
```

Validation:
├─ [ ] Build completes without errors
├─ [ ] No critical warnings in build log
├─ [ ] Static files generated
├─ [ ] Source maps created for debugging
└─ [ ] Build time < 5 minutes

==============================================
STEP 2: DEPLOY TO STAGING ENVIRONMENT
==============================================

Environment Setup:
```bash
# Staging environment variables (.env.staging)
NEXT_PUBLIC_API_BASE_URL=https://api.dynasty-os.internal:8000
NEXTAUTH_URL=https://staging.dynasty-os.internal
NEXTAUTH_SECRET=<staging-secret-key>

# NOTE: OAuth providers NOT configured yet
# This step is manual in Phase 2
```

Deployment:
```bash
# Option A: Using Next.js built-in server
npm start --port 3000

# Option B: Using PM2 (production-like)
pm2 start "npm start" --name "frontend-staging" --port 3000

# Option C: Using Docker
docker build -t dynasty-frontend:staging .
docker run -p 3000:3000 \
  -e NEXT_PUBLIC_API_BASE_URL=https://api.dynasty-os.internal:8000 \
  dynasty-frontend:staging
```

Access Staging:
```
http://staging.dynasty-os.internal:3000
```

Validation:
├─ [ ] Server listening on port 3000
├─ [ ] Homepage loads without errors
├─ [ ] Navigation renders correctly
├─ [ ] No console errors (check DevTools)
└─ [ ] Land+Build engine link present in navigation

==============================================
STEP 3: END-TO-END INTEGRATION TESTING
==============================================

Test Cases for Staging:

1. Navigation & Routing
   ├─ [ ] All routes load: /command-center, /dashboard, /properties
   ├─ [ ] Engines dropdown visible & clickable
   ├─ [ ] Land+Build link navigates to /engines/land-build
   └─ [ ] 404 handling for invalid routes

2. Land+Build Portal
   ├─ [ ] Portal loads: GET /engines/land-build
   ├─ [ ] UI components render: tabs, inputs, buttons
   ├─ [ ] Tab switching works (Property Input → Scenarios → Results)
   └─ [ ] Input form accepts data

3. API Integration
   ├─ [ ] Frontend can reach backend API
   ├─ [ ] API requests sent with correct headers
   ├─ [ ] Responses parsed correctly
   └─ [ ] Error handling for API failures

4. Land+Build Workflow (No Auth)
   ```bash
   # Note: Cannot test full workflow without auth
   # But can test form submission & API calls
   
   # Test property input form
   curl -X POST http://staging.dynasty-os.internal:3000/api/land-build/analyze \
     -H "Content-Type: application/json" \
     -d '{...}'
   ```
   ├─ [ ] Form validates inputs
   ├─ [ ] API call made with correct data
   ├─ [ ] Response received & displayed
   └─ [ ] No sensitive data exposed in console

5. Performance Metrics
   ├─ [ ] First contentful paint: < 2s
   ├─ [ ] Time to interactive: < 4s
   ├─ [ ] Lighthouse score: > 80
   └─ [ ] No critical console errors

6. Accessibility Audit
   ├─ [ ] Keyboard navigation works
   ├─ [ ] Screen reader compatible
   ├─ [ ] Color contrast sufficient
   └─ [ ] ARIA labels present

Automated Testing:
```bash
# Run Playwright E2E tests
npm run test:e2e

# Run accessibility audit
npm run audit:a11y

# Generate Lighthouse report
npm run audit:lighthouse
```

==============================================
STEP 4: SECURITY ASSESSMENT (STAGING)
==============================================

Security Testing Checklist:

1. Dependency Vulnerabilities (Known)
   ├─ [ ] Document all 9 known vulnerabilities (from npm audit)
   ├─ [ ] Assess risk of each in staging context
   ├─ [ ] Note that OAuth-only mode mitigates some risks
   └─ [ ] Record which vulnerabilities remain exposure

2. Authentication Flow (Verify No Credential Auth Active)
   ├─ [ ] No email/password login form visible
   ├─ [ ] No login endpoint active
   ├─ [ ] Session cookies secure (HttpOnly, Secure, SameSite)
   └─ [ ] JWT tokens (if used) have short expiration

3. Session Handling
   ├─ [ ] Session timeout works: 30 min inactivity → logout
   ├─ [ ] Session data not exposed in localStorage
   ├─ [ ] CSRF tokens present on all forms
   └─ [ ] No credential data in memory after logout

4. Protected Routes
   ├─ [ ] /engines/land-build redirects to login (without auth)
   ├─ [ ] /dashboard requires authentication
   ├─ [ ] /properties requires authentication
   └─ [ ] /command-center requires authentication

5. API Security
   ├─ [ ] CORS headers correct (only staging origin)
   ├─ [ ] No authentication bypass via direct API calls
   ├─ [ ] Rate limiting active (5 req/sec per IP)
   └─ [ ] Sensitive endpoints require valid session

6. Data Handling
   ├─ [ ] No API keys in client code (git grep for keys)
   ├─ [ ] Environment variables not leaked
   ├─ [ ] Database credentials not exposed
   └─ [ ] No sensitive data in network tab

Security Test Commands:
```bash
# Check for exposed secrets
git grep -i "password\|secret\|key\|token" -- "*.tsx" "*.ts" "*.js"

# Check console for errors
npm run build 2>&1 | grep -i "warn\|error"

# Scan dependencies for known exploits
npm audit

# Check for XSS vulnerabilities
npm run test:security

# OWASP Top 10 checks
npm run audit:owasp
```

==============================================
PHASE 3 HOLD GATE: REQUIRED DOCUMENTATION
==============================================

Before Phase 3 (Production Deployment), MUST COMPLETE:

Document 1: OAuth-Only Authentication Verification
─────────────────────────────────────────────────

Completion Checklist:
├─ [ ] OAuth providers configured (Google, GitHub, etc.)
├─ [ ] OAuth flow tested end-to-end in staging
├─ [ ] No email/password authentication available
├─ [ ] Session tokens properly issued & verified
├─ [ ] Token expiration working correctly
├─ [ ] Token refresh working correctly
├─ [ ] Logout clears all session data
└─ [ ] Cross-browser testing completed

Testing Results:
├─ [ ] Chrome/Chromium: PASSED
├─ [ ] Firefox: PASSED
├─ [ ] Safari: PASSED
├─ [ ] Edge: PASSED
└─ [ ] Mobile (iOS/Android): PASSED

Document 2: Credential Authentication Disabled Verification
──────────────────────────────────────────────────────────

Completion Checklist:
├─ [ ] Email/password login form removed from UI
├─ [ ] /auth/signin endpoint returns 404 or redirects
├─ [ ] /auth/callback/credentials endpoint disabled
├─ [ ] CredentialsProvider removed from next-auth config
├─ [ ] No email validation libraries active
├─ [ ] Nodemailer not imported or disabled
├─ [ ] JWT token signing uses OAuth provider keys only
└─ [ ] Code audit: grep -r "CredentialsProvider" → no results

Code Review:
├─ [ ] lib/auth.ts: OAuth providers only
├─ [ ] app/auth: Credential routes removed
├─ [ ] components: No email/password forms
└─ [ ] API routes: No credential endpoints

Document 3: Session Handling Security Verification
─────────────────────────────────────────────────

Session Security Tests:
├─ [ ] Session timeout after 30 min inactivity
├─ [ ] Session data not in localStorage (browser storage)
├─ [ ] Session cookies HttpOnly: true
├─ [ ] Session cookies Secure: true (HTTPS only)
├─ [ ] Session cookies SameSite: Strict
├─ [ ] No session data in URL query params
├─ [ ] Session ID changes on OAuth login
└─ [ ] Session destroyed completely on logout

Test Commands:
```bash
# Check session storage
open DevTools → Application → Cookies
# Verify HttpOnly, Secure, SameSite flags

# Check localStorage
open DevTools → Application → LocalStorage
# Should NOT contain session data

# Test timeout
npm run test:session:timeout
```

Document 4: Protected Routes Verification
────────────────────────────────────────

Protected Route Tests:
├─ Unauthenticated Access:
│  ├─ [ ] GET /engines/land-build → redirects to login
│  ├─ [ ] GET /dashboard → redirects to login
│  ├─ [ ] GET /properties → redirects to login
│  └─ [ ] GET /command-center → redirects to login
│
└─ Authenticated Access:
   ├─ [ ] GET /engines/land-build → loads UI
   ├─ [ ] GET /dashboard → loads dashboard
   ├─ [ ] GET /properties → loads properties
   └─ [ ] GET /command-center → loads command center

Test Script:
```bash
# Automated testing
npm run test:protected-routes
```

Document 5: Critical Vulnerability Impact Assessment
───────────────────────────────────────────────────

For Each Remaining Vulnerability, Document:

Example for TypeORM SQL Injection (CRITICAL):
├─ Vulnerability: SQL injection in typeORM v0.2.45
├─ Attack Vector: Direct SQL queries in backend
├─ Mitigation: Backend API separates data layer; frontend cannot trigger SQL
├─ Exposure in OAuth-Only Mode: REDUCED (no email auth)
├─ Remaining Risk: Backend-side only (mitigated by FastAPI)
├─ Impact if Exploited: Database compromise (backend responsibility)
├─ Timeline to Fix: Phase 4 (next-auth v5 upgrade) T+2-4 weeks
└─ Acceptance: APPROVED by @ARCHITECTURE

Example for JWT Signature Bypass (HIGH):
├─ Vulnerability: jsonwebtoken@8.5.1 algorithm confusion
├─ Attack Vector: Token forgery via algorithm manipulation
├─ Mitigation: OAuth providers issue & verify tokens, not frontend code
├─ Exposure in OAuth-Only Mode: REDUCED (OAuth provider security)
├─ Remaining Risk: Depends on OAuth provider security (Google/GitHub)
├─ Impact if Exploited: Session hijacking
├─ Timeline to Fix: Phase 4 (next-auth v5) T+2-4 weeks
└─ Acceptance: APPROVED by @ARCHITECTURE

Complete assessment for all 9 vulnerabilities and document exposure reduction.

Document 6: Rollback Plan
────────────────────────

If Production Frontend Fails (Phase 3):

Immediate Actions (T+0):
1. Switch load balancer back to old frontend (if available)
2. Alert on-call team: "Frontend rollback initiated"
3. Disable frontend in production: redirect /engines to maintenance page
4. Keep backend API online (backend remains stable)

Rollback Steps:
```bash
# Stop new frontend
pm2 stop frontend-production

# Restore previous version (if available)
git checkout <PREVIOUS_TAG> -- frontend/

# Rebuild and restart
npm install --legacy-peer-deps
npm run build
pm2 start frontend-production

# Verify
curl http://production.dynasty-os.internal:3000/health
```

Verify Rollback Success:
├─ [ ] Frontend accessible
├─ [ ] Previous version loaded
├─ [ ] Backend still responding
├─ [ ] No data corruption
└─ [ ] Team notified

Timeline: 15-30 minutes total

Document 7: Security Sign-Off Template
─────────────────────────────────────

```
═══════════════════════════════════════════════
OAUTH-ONLY FRONTEND SECURITY SIGN-OFF
═══════════════════════════════════════════════

Project: Dynasty PropertyOS Frontend
Environment: Staging → Production
Phase: 3 Hold Gate Verification
Date: ___________

SECURITY TEAM REVIEW:
─────────────────────

OAuth-Only Authentication:
├─ [ ] VERIFIED: Email/password authentication disabled
├─ [ ] VERIFIED: OAuth providers configured & tested
├─ [ ] VERIFIED: Session management secure
└─ [ ] VERIFIED: No credential exposure

Dependency Risk Assessment:
├─ [ ] REVIEWED: 9 known vulnerabilities documented
├─ [ ] ASSESSED: OAuth-only mode reduces JWT/email risks
├─ [ ] NOTED: TypeORM SQL injection mitigated by backend
├─ [ ] ACCEPTED: Remaining risks documented & acceptable
└─ [ ] PLANNED: Phase 4 remediation scheduled

Protected Routes:
├─ [ ] TESTED: All routes require authentication
├─ [ ] TESTED: Unauthenticated redirects to OAuth
├─ [ ] TESTED: Session timeout working
└─ [ ] TESTED: Logout clears all data

API Security:
├─ [ ] VERIFIED: CORS headers correct
├─ [ ] VERIFIED: No API key exposure
├─ [ ] VERIFIED: Rate limiting active
└─ [ ] VERIFIED: Sensitive data not logged

Data Handling:
├─ [ ] VERIFIED: No credentials in localStorage
├─ [ ] VERIFIED: Session cookies secure flags set
├─ [ ] VERIFIED: No sensitive data in network tab
└─ [ ] VERIFIED: All data encrypted in transit

RISK ASSESSMENT:
────────────────

Current Risk Level: MODERATE (OAuth-only mode)
├─ Reduced from: CRITICAL (if credential auth enabled)
├─ Remaining: Backend-side vulnerabilities & dependency risks
├─ Mitigation: Monitoring, alerting, Phase 4 planned
└─ Acceptable: YES, with conditions

CONDITIONS FOR PHASE 3 PRODUCTION DEPLOYMENT:
──────────────────────────────────────────────

1. OAuth-only mode verified (this document completed)
2. All protected routes tested & passing
3. Session handling secure (cookies, timeouts, logout)
4. Monitoring & alerting enabled for:
   ├─ Authentication failures
   ├─ Session anomalies
   ├─ API error spikes
   └─ Database connection issues
5. On-call team scheduled 24/7
6. Rollback plan tested & ready
7. @ARCHITECT approval obtained
8. Phase 1 backend stable 24+ hours

CONDITIONS FOR PHASE 4 REMEDIATION:
────────────────────────────────────

Timeline: Start Week 4, Complete by Week 6
Scope:
├─ Upgrade next-auth v3 → v5
├─ Update all auth adapters
├─ Update vulnerable dependencies
├─ Full regression testing
└─ Deploy to production

Success Criteria:
├─ [ ] npm audit shows 0 vulnerabilities
├─ [ ] All E2E tests passing
├─ [ ] Email auth re-enabled & tested
├─ [ ] Performance maintained or improved
└─ [ ] Zero security findings

SIGN-OFF AUTHORITY:
───────────────────

Security Review By: _______________
Date: _______________
Signature: _______________

Architecture Approval: _______________
Date: _______________
Signature: _______________

Legal/Compliance: _______________
Date: _______________
Signature: _______________

═══════════════════════════════════════════════
This document authorizes Phase 3 (Production)
deployment with OAuth-only authentication mode.

Effective Until: Phase 4 completion or
30 days from date above (whichever first).

Document Version: 1.0
Created: 2026-07-03
```

==============================================
PHASE 2 COMPLETION CHECKLIST
==============================================

Deployment Owner: @QA / @DEVOPS
Staging URL: https://staging.dynasty-os.internal
Backend Endpoint: https://api.dynasty-os.internal:8000

PRE-STAGING:
├─ [ ] Phase 1 backend LIVE & stable
├─ [ ] Frontend code reviewed
├─ [ ] All dependencies installed
└─ [ ] Build tested locally

DURING-STAGING:
├─ [ ] Frontend deployed to staging
├─ [ ] All E2E tests passing
├─ [ ] Performance baseline recorded
├─ [ ] Security audit completed
└─ [ ] All 7 documentation artifacts created

POST-STAGING:
├─ [ ] All 7 sign-off documents completed
├─ [ ] Security team sign-off obtained
├─ [ ] Monitoring configured
└─ [ ] @ARCHITECTURE approval for Phase 3

PHASE 3 GATE STATUS:
├─ [ ] OAuth-only authentication VERIFIED
├─ [ ] Credential auth DISABLED
├─ [ ] Session handling SECURE
├─ [ ] Protected routes TESTED
├─ [ ] Vulnerability impact DOCUMENTED
├─ [ ] Rollback plan READY
└─ [ ] Security sign-off SIGNED

Ready for Phase 3 Production: ☐ NO / ☐ YES (if all above checked)

==============================================
END OF PHASE 2 STAGING PLAN
