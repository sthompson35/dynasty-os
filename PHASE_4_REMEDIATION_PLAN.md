PHASE 4: NEXT-AUTH V3 → V5 REMEDIATION PLAN
Dynasty PropertyOS Frontend Security Upgrade
============================================

DEPLOYMENT DECISION: REQUIRED POST-LAUNCH
Date: 2026-07-03
Authority: @ARCHITECT
Timeline: Weeks 4-6 (2-4 weeks after Phase 3 production)
Status: PLANNED - START AFTER PHASE 3 STABILIZES

Objective: Replace legacy next-auth v3 with next-auth v5 to eliminate:
├─ JWT signature bypass vulnerabilities
├─ jsonwebtoken risks
├─ Nodemailer SMTP injection risks
├─ TypeORM SQL injection exposure
└─ UUID buffer overflow exposure

==============================================
PHASE 4 WORK BREAKDOWN
==============================================

WEEK 1: PLANNING & BRANCH SETUP
================================

Task 1: Create Remediation Branch
```bash
cd C:\dynasty_property_os\frontend

# Create feature branch
git checkout -b security/next-auth-v5-upgrade
git push -u origin security/next-auth-v5-upgrade

# Document branch purpose
git branch --edit-description  # Add detailed description
```

Task 2: Audit Current next-auth@v3 Usage
```bash
# Find all next-auth imports
grep -r "from next-auth\|import.*next-auth" --include="*.ts" --include="*.tsx" .

# Find all auth config files
find . -name "*auth*" -type f | grep -E "\.(ts|tsx|js)$"

# List all auth-related dependencies
npm list | grep -i auth
```

Current Usage Map:
├─ [ ] lib/auth.ts - Main configuration
├─ [ ] app/api/auth - API routes
├─ [ ] middleware.ts - Session middleware
├─ [ ] components - Auth components
└─ [ ] pages - Auth pages

Task 3: Create Migration Plan Document
```bash
# Document each change needed
cat > NEXT_AUTH_MIGRATION.md << 'EOF'
# Next-Auth v3 → v5 Migration Plan

## Changes Required

### 1. Configuration Changes
- Old: pages/api/auth/[...nextauth].ts
- New: auth.ts with Route Handlers

### 2. API Route Changes
- Old: /api/auth/signin, /api/auth/signout
- New: POST /api/auth/signin, POST /api/auth/signout

### 3. Session Provider Changes
- Old: <SessionProvider session={...}>
- New: <SessionProvider session={...}>  (same but internals change)

### 4. Authentication Changes
- Old: Email provider (to be removed)
- New: OAuth providers only

### 5. Adapter Changes
- Old: @next-auth/prisma-adapter@1.0.7
- New: @auth/prisma-adapter (new namespace)

### 6. TypeORM Removal
- Old: @next-auth/typeorm-legacy-adapter
- New: Use Prisma instead (no TypeORM needed)

EOF
```

Task 4: Set Up Test Environment
```bash
# Create a test build without deploying
npm install next-auth@5 @auth/prisma-adapter --save-peer

# Note which packages conflict
npm list 2>&1 | grep ERESOLVE

# Document all conflicts for resolution
```

Dependencies to Update:
├─ [ ] next-auth: v3.29.10 → v5.x.x
├─ [ ] @next-auth/prisma-adapter: 1.0.7 → @auth/prisma-adapter
├─ [ ] Remove: @next-auth/typeorm-legacy-adapter
├─ [ ] Remove: @next-auth/prisma-legacy-adapter
├─ [ ] Update: prisma: 4.x → 5.x (if needed)
└─ [ ] Update: jose, jsonwebtoken, nodemailer (automatically via next-auth)

WEEK 2: DEPENDENCY UPDATES & CONFIG MIGRATION
===============================================

Task 1: Update Package.json
```bash
# Update all auth dependencies
npm install next-auth@5 \
  @auth/prisma-adapter \
  prisma \
  @prisma/client \
  --save

# Remove legacy dependencies
npm uninstall @next-auth/typeorm-legacy-adapter \
  @next-auth/prisma-legacy-adapter

# Update other peer dependencies
npm install --legacy-peer-deps
```

Verify Clean Installation:
```bash
npm audit
# Should now show 0 or significantly fewer vulnerabilities
```

Task 2: Migrate auth.ts Configuration
Old Structure (next-auth v3):
```javascript
// pages/api/auth/[...nextauth].ts
import NextAuth from "next-auth"
import Providers from "next-auth/providers"

export default NextAuth({
  providers: [
    Providers.Credentials({
      credentials: { email, password },
      authorize: async (creds) => { ... }
    }),
    Providers.Google({ clientId, clientSecret }),
  ],
  adapter: PrismaAdapter(prisma),
  session: { jwt: true },
  jwt: { encryption: true },
})
```

New Structure (next-auth v5):
```javascript
// lib/auth.ts
import NextAuth from "next-auth"
import Google from "next-auth/providers/google"
import GitHub from "next-auth/providers/github"
import { PrismaAdapter } from "@auth/prisma-adapter"
import prisma from "@/lib/prisma"

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      clientId: process.env.GOOGLE_ID,
      clientSecret: process.env.GOOGLE_SECRET,
    }),
    GitHub({
      clientId: process.env.GITHUB_ID,
      clientSecret: process.env.GITHUB_SECRET,
    }),
  ],
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
})
```

Migration Checklist:
├─ [ ] Remove CredentialsProvider
├─ [ ] Add Google provider
├─ [ ] Add GitHub provider (or other OAuth)
├─ [ ] Update adapter to PrismaAdapter
├─ [ ] Update session configuration
├─ [ ] Update JWT configuration
├─ [ ] Update pages configuration
└─ [ ] Test OAuth flow

Task 3: Update API Routes
Old Structure (next-auth v3):
```bash
# Dynamic route
pages/api/auth/[...nextauth].ts
```

New Structure (next-auth v5):
```bash
# Multiple route handlers
app/api/auth/signin/route.ts
app/api/auth/signout/route.ts
app/api/auth/callback/[provider]/route.ts
app/api/auth/session/route.ts
```

Create New Routes:
```bash
mkdir -p app/api/auth/{signin,signout,callback}

# Create signin handler
cat > app/api/auth/signin/route.ts << 'EOF'
import { signIn } from "@/lib/auth"

export async function POST(req: Request) {
  return await signIn("oauth-provider", { redirectTo: "/" })
}
EOF

# Create signout handler
cat > app/api/auth/signout/route.ts << 'EOF'
import { signOut } from "@/lib/auth"

export async function POST() {
  return await signOut({ redirectTo: "/" })
}
EOF
```

Migration Checklist:
├─ [ ] Create app/api/auth/ routes
├─ [ ] Implement signin handler
├─ [ ] Implement signout handler
├─ [ ] Implement callback handler
├─ [ ] Remove pages/api/auth/ directory
└─ [ ] Test all routes

Task 4: Update Middleware
Old Structure (next-auth v3):
```javascript
// middleware.ts
import { getSession } from "next-auth/react"

export async function middleware(req) {
  const session = await getSession({ req })
  if (!session) return NextResponse.redirect('/auth/signin')
}
```

New Structure (next-auth v5):
```javascript
// middleware.ts
import { auth } from "@/lib/auth"

export const middleware = auth((req) => {
  if (!req.auth && req.nextUrl.pathname.startsWith('/engines')) {
    return Response.redirect(new URL('/auth/signin', req.url))
  }
})

export const config = {
  matcher: ['/engines/:path*', '/dashboard/:path*', '/command-center/:path*'],
}
```

Migration Checklist:
├─ [ ] Update middleware imports
├─ [ ] Use new auth() function
├─ [ ] Update matcher paths
├─ [ ] Test protected routes redirect to login
└─ [ ] Verify unauthenticated access blocked

WEEK 3: COMPONENT UPDATES & TESTING
===================================

Task 1: Update SessionProvider
```javascript
// app/layout.tsx
import { SessionProvider } from "next-auth/react"
import { auth } from "@/lib/auth"

export default async function RootLayout({ children }) {
  const session = await auth()
  
  return (
    <html>
      <body>
        <SessionProvider session={session}>
          {children}
        </SessionProvider>
      </body>
    </html>
  )
}
```

Migration Checklist:
├─ [ ] Update SessionProvider wrapper
├─ [ ] Pass session from auth()
├─ [ ] Remove getSession() calls
└─ [ ] Test session availability in components

Task 2: Update useSession Calls
Old:
```javascript
import { useSession } from "next-auth/react"

export function MyComponent() {
  const { data: session } = useSession()
  return <p>{session?.user?.email}</p>
}
```

New:
```javascript
import { useSession } from "next-auth/react"

export function MyComponent() {
  const { data: session } = useSession()
  return <p>{session?.user?.email}</p>
}
// Note: Hook usage remains similar, just internals change
```

Migration Checklist:
├─ [ ] Test all useSession() calls
├─ [ ] Verify session data structure
├─ [ ] Check email & name availability
└─ [ ] Test logout clearing session

Task 3: Run Full Test Suite
```bash
# Run all tests
npm run test:e2e
npm run test:unit
npm run test:integration

# Specifically test auth
npm run test -- auth --watch

# Test protected routes
npm run test -- protected-routes
```

Test Cases to Validate:
├─ [ ] OAuth login flow (Google)
├─ [ ] OAuth login flow (GitHub)
├─ [ ] Session creation after login
├─ [ ] User data in session
├─ [ ] Logout flow
├─ [ ] Session timeout
├─ [ ] Protected routes redirect
├─ [ ] Land+Build portal access with auth
└─ [ ] No email/password auth available

Task 4: Security Testing
```bash
# Vulnerability scan
npm audit

# Expected: 0 vulnerabilities or acceptable list

# OWASP checklist
npm run test:owasp

# Penetration testing basics
npm run test:security
```

Expected Results:
├─ [ ] npm audit: 0 vulnerabilities
├─ [ ] OWASP scan: No critical findings
├─ [ ] No JWT bypass possible
├─ [ ] No SQL injection possible (TypeORM removed)
├─ [ ] No email injection possible (Nodemailer disabled)
└─ [ ] Session secure & timeout working

WEEK 4: DEPLOYMENT & VERIFICATION
==================================

Task 1: Staging Deployment
```bash
# Deploy Phase 4 to staging environment
npm run build
npm run deploy:staging

# Verify in staging
curl https://staging.dynasty-os.internal/api/auth/signin
```

Validation:
├─ [ ] Build completes without errors
├─ [ ] No console errors
├─ [ ] OAuth login works
├─ [ ] Session created
├─ [ ] Land+Build accessible after auth
└─ [ ] Performance acceptable

Task 2: Production Canary Deployment (Optional)
```bash
# Deploy to 10% of production traffic
npm run deploy:production:canary 10%

# Monitor for 1 hour
# Check error rates, performance, auth success rates
npm run monitor:metrics
```

Monitoring Checklist:
├─ [ ] Error rate < 1%
├─ [ ] OAuth success rate > 99%
├─ [ ] Response time < 1s
├─ [ ] No database errors
└─ [ ] Session timeouts working

Task 3: Full Production Deployment
```bash
# After canary passes, deploy to all users
npm run deploy:production:full

# Verify
curl https://dynasty-os.internal/api/auth/signin
```

Verification:
├─ [ ] All users can login via OAuth
├─ [ ] No migration issues
├─ [ ] Performance maintained
├─ [ ] Monitoring shows normal metrics
└─ [ ] No rollback needed

Task 4: Final Security Audit
```bash
# Final vulnerability scan
npm audit

# Should show 0 critical/high vulnerabilities

# Final OWASP check
npm run test:owasp

# Penetration test
npm run test:pentest
```

Final Checklist:
├─ [ ] npm audit: 0 vulnerabilities ✓
├─ [ ] OWASP: No findings ✓
├─ [ ] JWT vulnerabilities: PATCHED ✓
├─ [ ] Email auth vulnerabilities: REMOVED ✓
├─ [ ] TypeORM SQL injection: MITIGATED ✓
├─ [ ] UUID buffer overflow: FIXED ✓
└─ [ ] Production secure ✓

==============================================
PHASE 4 SUCCESS CRITERIA
==============================================

CRITICAL (MUST HAVE):
├─ [ ] npm audit shows 0 vulnerabilities (or acceptable list)
├─ [ ] All tests passing (E2E, unit, integration)
├─ [ ] OAuth authentication working
├─ [ ] Email auth REMOVED
├─ [ ] Land+Build accessible to authenticated users
├─ [ ] No data loss during migration
└─ [ ] Zero security findings

IMPORTANT (SHOULD HAVE):
├─ [ ] Performance maintained or improved
├─ [ ] User experience not degraded
├─ [ ] Documentation updated
├─ [ ] Team trained on new auth system
└─ [ ] Runbook updated

NICE-TO-HAVE:
├─ [ ] Load testing completed
├─ [ ] Additional OAuth providers added
├─ [ ] Admin auth dashboard created
└─ [ ] Audit logging enhanced

==============================================
PHASE 4 SIGN-OFF
==============================================

Remediation Owner: @CODING
Branch: security/next-auth-v5-upgrade
Duration: 2-4 weeks

Week 1 Sign-Off: Planning Complete
├─ [ ] Branch created
├─ [ ] Migration plan documented
├─ [ ] Dependencies inventoried
└─ Signature: _____________

Week 2 Sign-Off: Migrations Complete
├─ [ ] Package.json updated
├─ [ ] Auth configuration migrated
├─ [ ] API routes created
├─ [ ] Middleware updated
└─ Signature: _____________

Week 3 Sign-Off: Testing Complete
├─ [ ] Components updated
├─ [ ] All tests passing
├─ [ ] Security tests passing
└─ Signature: _____________

Week 4 Sign-Off: Deployment Complete
├─ [ ] Staging validated
├─ [ ] Production deployed
├─ [ ] Final audit passed
└─ Signature: _____________

==============================================
PHASE 4 COMPLETION: SYSTEM FULLY REMEDIATED
==============================================

After Phase 4 Completion:
├─ Next-Auth: v3.29.10 → v5.x.x ✓
├─ Vulnerabilities: 9 → 0 ✓
├─ JWT Risks: ELIMINATED ✓
├─ Email Auth: REMOVED ✓
├─ TypeORM Risks: MITIGATED ✓
├─ Production Ready: YES ✓
└─ Security Posture: PRODUCTION STANDARD ✓

Dynasty PropertyOS is now:
✓ FULLY SECURE
✓ PRODUCTION-HARDENED
✓ COMPLIANCE-READY (SOC2/OWASP)
✓ READY FOR SCALING

==============================================
END OF PHASE 4 PLAN
