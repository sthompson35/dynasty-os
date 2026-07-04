PHASE 1 DEPLOYMENT EXECUTION PLAN
Dynasty PropertyOS - Backend & Land+Build Engine
==============================================

DEPLOYMENT DECISION: APPROVED
Date: 2026-07-03
Authority: @ARCHITECT
Status: ACTIVE

Approved Components:
├─ Backend FastAPI
├─ Land + Build UW/DD Sub-Engine
├─ Supabase Database
└─ Frontend Staging (no production deployment)

==============================================
PHASE 1: BACKEND DEPLOYMENT RUNBOOK
==============================================

PREREQUISITE CHECKS
===================

Before deployment, verify:

Backend System Checks:
├─ [ ] All Python dependencies installed: pip list | grep -E "fastapi|starlette|uvicorn"
├─ [ ] No conflicting Python versions: python --version (must be 3.9+)
├─ [ ] Virtual environment activated: which python (or where python on Windows)
├─ [ ] Environment variables configured: .env file present with:
│      ├─ DATABASE_URL=postgresql://...
│      ├─ SUPABASE_URL=https://...
│      ├─ SUPABASE_KEY=...
│      └─ API_PORT=8000
├─ [ ] Database migrations created: alembic revision --autogenerate
└─ [ ] Static files organized: mkdir -p backend/static

Land + Build Engine Checks:
├─ [ ] Module imports verified: python -c "from dynasty_os.engines.land_build_uw_dd_engine import LandBuild_UW_DDEngine"
├─ [ ] Sub-engines initialized: python -c "e = LandBuild_UW_DDEngine(); print(len(vars(e)))"
├─ [ ] API endpoints registered: grep -r "land-build" backend/app/main.py
└─ [ ] Test analysis passes: python test_land_build_integration.py

Supabase Database Checks:
├─ [ ] Connection string valid: TEST_DATABASE_URL=...
├─ [ ] Schema created: psql -c "SELECT * FROM information_schema.tables"
├─ [ ] Auth configured: supabase auth:show-config
└─ [ ] Backup scheduled: supabase backup:show

==============================================
PHASE 1 DEPLOYMENT WORKFLOW
==============================================

STEP 1: DATABASE INITIALIZATION (T+0 min)
==========================================

Task: Deploy Supabase database schema

Commands:
```bash
cd C:\dynasty_property_os\backend

# Test database connection
python -c "from app.db import get_supabase; client = get_supabase(); print('DB Connected')"

# Run migrations (if using alembic)
alembic upgrade head

# Verify schema
python -c "from app.db import get_supabase; client = get_supabase(); tables = client.table('information_schema').select('*').execute(); print(f'Tables: {len(tables.data)}')"
```

Validation:
├─ [ ] Connection successful
├─ [ ] Schema migrated without errors
├─ [ ] All tables created
└─ [ ] Indexes configured

Rollback (if needed):
```bash
alembic downgrade -1  # Rollback one migration
supabase db reset     # Full reset (destructive)
```

STEP 2: BACKEND SERVICE STARTUP (T+10 min)
==========================================

Task: Start FastAPI backend server

Commands:
```bash
cd C:\dynasty_property_os\backend

# Check dependencies
pip list | findstr fastapi starlette uvicorn pydantic

# Start server (development)
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Start server (production)
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

Expected Output:
```
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     Application startup complete
```

Validation:
├─ [ ] Server listening on port 8000
├─ [ ] No startup errors in logs
├─ [ ] Health check responds: GET /health
└─ [ ] API documentation available: GET /docs

Smoke Test:
```bash
curl http://localhost:8000/health
# Expected: {"ok": true}
```

STEP 3: LAND+BUILD ENGINE VERIFICATION (T+15 min)
==============================================

Task: Verify Land+Build sub-engine is operational

Commands:
```bash
# Test engine initialization
python -c "
from dynasty_os.engines.deal_engine import DealEngine
de = DealEngine()
print(f'Land+Build enabled: {de.land_build_uw_dd is not None}')
print(f'Sub-engines: {list(vars(de.land_build_uw_dd).keys())}')
"

# Test API endpoint
curl -X POST http://localhost:8000/api/land-build/analyze \
  -H "Content-Type: application/json" \
  -d '{
    "property_input": {
      "property_id": "TEST-001",
      "address": "123 Main St",
      "city": "Phoenix",
      "state": "AZ",
      "county": "Maricopa",
      "zipcode": "85001",
      "property_type": "Vacant Land",
      "lot_size_acres": 2.5,
      "purchase_price": 250000,
      "arv_land": 300000,
      "build_cost_estimate": 500000
    }
  }'
```

Expected Response:
```json
{
  "success": true,
  "property_id": "TEST-001",
  "address": "123 Main St Phoenix AZ",
  "property_input": {...},
  "sale_scenario": {...},
  "rental_backstop": {...},
  "exit_strategy": {...},
  "offer_calculation": {...},
  "dd_checklist": {...}
}
```

Validation:
├─ [ ] Engine imports successfully
├─ [ ] All 8 sub-engines initialized
├─ [ ] API endpoint responds
├─ [ ] Analysis result contains all expected fields
└─ [ ] No errors in backend logs

STEP 4: INTEGRATION TESTING (T+25 min)
====================================

Task: Run full backend integration tests

Commands:
```bash
cd C:\dynasty_property_os

# Run backend tests
python -m pytest backend/tests -v

# Run Land+Build specific tests
python -m pytest backend/tests/test_land_build_engine.py -v

# Test database persistence
python -m pytest backend/tests/test_database.py -v
```

Expected Results:
├─ All tests pass (100%)
├─ No timeout errors
├─ Database transactions rollback correctly
└─ Error handling validated

Critical Tests:
├─ [ ] Land+Build analysis test
├─ [ ] Property input validation test
├─ [ ] Sale scenario calculation test
├─ [ ] Rental backstop modeling test
├─ [ ] DD checklist generation test
├─ [ ] API endpoint integration test
└─ [ ] Database transaction test

STEP 5: PERFORMANCE BASELINE (T+35 min)
=====================================

Task: Establish baseline metrics before production

Commands:
```bash
# Check response time (should be < 500ms for analysis)
time curl -X POST http://localhost:8000/api/land-build/analyze \
  -H "Content-Type: application/json" \
  -d '{"property_input": {...}}'

# Monitor resource usage
# Windows: Get-Process python | Select Name, CPU, Memory
# Linux: ps aux | grep uvicorn

# Check error rates (should be 0)
grep -c "ERROR" logs/app.log
```

Baselines to Record:
├─ [ ] API response time: _____ ms
├─ [ ] CPU usage (avg): _____ %
├─ [ ] Memory usage (avg): _____ MB
├─ [ ] Error rate (initial): _____ %
└─ [ ] Throughput (requests/sec): _____ req/s

STEP 6: LOGGING & MONITORING (T+45 min)
======================================

Task: Enable production logging & monitoring

Commands:
```bash
# Enable structured logging
export LOG_LEVEL=INFO
export LOG_FORMAT=json

# Start with logging
python -m uvicorn app.main:app \
  --host 0.0.0.0 \
  --port 8000 \
  --log-config logging.yaml

# Verify logs are being captured
tail -f logs/app.log | grep "land-build"
```

Logging Checklist:
├─ [ ] All requests logged with correlation ID
├─ [ ] Errors logged with full stack trace
├─ [ ] Performance metrics tracked
├─ [ ] Sensitive data redacted (passwords, tokens)
└─ [ ] Log rotation configured

Monitoring Setup:
├─ [ ] Prometheus metrics endpoint: /metrics
├─ [ ] Health check: /health (every 30s)
├─ [ ] Error tracking enabled
└─ [ ] Alerts configured for:
    ├─ High error rate (>5%)
    ├─ High response time (>1s)
    ├─ Service down (timeout)
    └─ Database connection failures

==============================================
PHASE 1 DEPLOYMENT CHECKLIST
==============================================

PRE-DEPLOYMENT (T-60 min):
├─ [ ] Code reviewed & approved by @ARCHITECT
├─ [ ] All tests passing on local machine
├─ [ ] No uncommitted changes: git status
├─ [ ] Docker image built (if using containers)
├─ [ ] Database backups created
├─ [ ] Rollback procedures documented
└─ [ ] Stakeholders notified

DEPLOYMENT (T+0 min):
├─ [ ] Step 1: Database initialization
├─ [ ] Step 2: Backend service startup
├─ [ ] Step 3: Land+Build engine verification
├─ [ ] Step 4: Integration testing
├─ [ ] Step 5: Performance baseline
├─ [ ] Step 6: Logging & monitoring
└─ [ ] Deployment completed at HH:MM UTC

POST-DEPLOYMENT (T+60 min):
├─ [ ] Health check passing (5+ requests)
├─ [ ] No critical errors in logs
├─ [ ] Database transactions working
├─ [ ] Land+Build API responding
├─ [ ] Monitoring metrics normal
├─ [ ] Performance within baseline
└─ [ ] Team notified: "Phase 1 LIVE"

==============================================
DEPLOYMENT SUCCESS CRITERIA
==============================================

CRITICAL (MUST HAVE):
├─ Backend API online and responding
├─ Land+Build endpoints functional
├─ Database connected & migrated
├─ No critical errors in logs (first 30 min)
└─ Health check passing

IMPORTANT (SHOULD HAVE):
├─ < 10% error rate
├─ Response time < 1 second
├─ Monitoring & alerting active
└─ On-call team standing by

NICE-TO-HAVE:
├─ Load testing completed
├─ Performance tuning done
├─ Documentation updated
└─ Runbook validated

==============================================
ROLLBACK PROCEDURES
==============================================

IF Database Schema Migration Fails:
```bash
# Rollback to previous migration
alembic downgrade -1

# Or full rollback (careful!)
alembic downgrade base
```

IF Backend Service Won't Start:
```bash
# Check for port conflicts
netstat -ano | findstr :8000

# Kill process using port 8000
taskkill /PID <PID> /F

# Restart with debug logging
python -m uvicorn app.main:app --log-level debug
```

IF Land+Build Engine Fails to Import:
```bash
# Check import path
python -c "import sys; print(sys.path)"

# Verify module exists
ls dynasty_os/engines/land_build_uw_dd_engine.py

# Reinstall package in editable mode
pip install -e .
```

IF Database Connection Fails:
```bash
# Test connection string
python -c "
import os
url = os.getenv('DATABASE_URL')
print(f'Connection URL: {url}')
# Try connecting
from sqlalchemy import create_engine
engine = create_engine(url)
conn = engine.connect()
"

# Verify Supabase credentials in .env
cat .env | grep SUPABASE
```

FULL ROLLBACK (Revert to Previous Version):
```bash
# Restore from git
git checkout main -- .

# Restore database from backup
supabase db restore --backup-id <BACKUP_ID>

# Restart service
systemctl restart dynasty-backend
```

==============================================
PHASE 1 SIGN-OFF
==============================================

Deployment Owner: @DEVOPS
Date Deployed: ___________
Time Deployed: ___________

Pre-Deployment Sign-Off:
├─ [ ] All prerequisites verified
├─ [ ] Code reviewed & approved
├─ [ ] Backups created
└─ Signature: _____________

Post-Deployment Sign-Off:
├─ [ ] All success criteria met
├─ [ ] Health checks passing
├─ [ ] Team notified
└─ Signature: _____________

==============================================
HANDOFF TO PHASE 2
==============================================

Once Phase 1 is LIVE:

1. Notify: @QA
   └─ "Phase 1 complete. Proceed with Phase 2 staging deployment."

2. Notify: @SECURITY
   └─ "Backend live. Begin OAuth-only frontend risk assessment."

3. Notify: @CODING
   └─ "Backend stable. Start next-auth v3→v5 remediation branch."

4. Maintain: Backend uptime monitoring
   └─ Continue 24/7 monitoring & alerting

==============================================
END OF PHASE 1 RUNBOOK
