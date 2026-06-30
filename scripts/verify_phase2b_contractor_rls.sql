-- Verifies phase-2b contractor exceptions:
-- 1) Assigned contractor can update status on maintenance_requests and rehab_scopes.
-- 2) Non-assigned contractor cannot update those rows.
-- 3) Contractors still cannot change non-status fields on assigned rows.

-- Seed constants (fixed UUIDs for repeatable runs)
-- org:            00000000-0000-0000-0000-000000000111
-- contractor A:   auth_user_id 00000000-0000-0000-0000-000000000201
-- contractor B:   auth_user_id 00000000-0000-0000-0000-000000000202

-- ====================
-- Seed / refresh setup
-- ====================
DELETE FROM public.maintenance_requests WHERE id IN (
    '00000000-0000-0000-0000-000000000701',
    '00000000-0000-0000-0000-000000000702'
);
DELETE FROM public.rehab_scopes WHERE id IN (
    '00000000-0000-0000-0000-000000000801',
    '00000000-0000-0000-0000-000000000802'
);
DELETE FROM public.rehab_projects WHERE id = '00000000-0000-0000-0000-000000000601';
DELETE FROM public.properties WHERE id = '00000000-0000-0000-0000-000000000501';
DELETE FROM public.contractors WHERE id IN (
    '00000000-0000-0000-0000-000000000401',
    '00000000-0000-0000-0000-000000000402'
);
DELETE FROM public.app_users WHERE id IN (
    '00000000-0000-0000-0000-000000000301',
    '00000000-0000-0000-0000-000000000302',
    '00000000-0000-0000-0000-000000000303'
);
DELETE FROM public.organizations WHERE id = '00000000-0000-0000-0000-000000000111';

INSERT INTO public.organizations (id, name)
VALUES ('00000000-0000-0000-0000-000000000111', 'RLS Verify Org');

INSERT INTO public.app_users (id, auth_user_id, organization_id, full_name, email, role)
VALUES
    (
        '00000000-0000-0000-0000-000000000301',
        '00000000-0000-0000-0000-000000000201',
        '00000000-0000-0000-0000-000000000111',
        'Contractor Alpha User',
        'contractor.alpha@example.com',
        'contractor'
    ),
    (
        '00000000-0000-0000-0000-000000000302',
        '00000000-0000-0000-0000-000000000202',
        '00000000-0000-0000-0000-000000000111',
        'Contractor Beta User',
        'contractor.beta@example.com',
        'contractor'
    ),
    (
        '00000000-0000-0000-0000-000000000303',
        '00000000-0000-0000-0000-000000000203',
        '00000000-0000-0000-0000-000000000111',
        'Owner Verify User',
        'owner.verify@example.com',
        'owner'
    );

INSERT INTO public.contractors (id, organization_id, company_name, contact_name, email)
VALUES
    (
        '00000000-0000-0000-0000-000000000401',
        '00000000-0000-0000-0000-000000000111',
        'Alpha Contracting LLC',
        'Contractor Alpha User',
        'contractor.alpha@example.com'
    ),
    (
        '00000000-0000-0000-0000-000000000402',
        '00000000-0000-0000-0000-000000000111',
        'Beta Contracting LLC',
        'Contractor Beta User',
        'contractor.beta@example.com'
    );

INSERT INTO public.properties (id, organization_id, property_code, address)
VALUES (
    '00000000-0000-0000-0000-000000000501',
    '00000000-0000-0000-0000-000000000111',
    'RLS-VERIFY-001',
    '101 Verification Way'
);

INSERT INTO public.rehab_projects (id, property_id, project_name, status)
VALUES (
    '00000000-0000-0000-0000-000000000601',
    '00000000-0000-0000-0000-000000000501',
    'Verification Rehab Project',
    'planning'
);

INSERT INTO public.maintenance_requests (
    id,
    property_id,
    request_title,
    description,
    priority,
    status,
    assigned_contractor_id
)
VALUES
    (
        '00000000-0000-0000-0000-000000000701',
        '00000000-0000-0000-0000-000000000501',
        'MR Assigned to Alpha',
        'Keep original description alpha',
        'normal',
        'open',
        '00000000-0000-0000-0000-000000000401'
    ),
    (
        '00000000-0000-0000-0000-000000000702',
        '00000000-0000-0000-0000-000000000501',
        'MR Assigned to Beta',
        'Keep original description beta',
        'normal',
        'open',
        '00000000-0000-0000-0000-000000000402'
    );

INSERT INTO public.rehab_scopes (
    id,
    rehab_project_id,
    category,
    scope_item,
    description,
    priority,
    status,
    assigned_contractor_id
)
VALUES
    (
        '00000000-0000-0000-0000-000000000801',
        '00000000-0000-0000-0000-000000000601',
        'plumbing',
        'Replace shutoff valve alpha',
        'Keep original scope description alpha',
        'normal',
        'not_started',
        '00000000-0000-0000-0000-000000000401'
    ),
    (
        '00000000-0000-0000-0000-000000000802',
        '00000000-0000-0000-0000-000000000601',
        'electrical',
        'Upgrade breaker beta',
        'Keep original scope description beta',
        'normal',
        'not_started',
        '00000000-0000-0000-0000-000000000402'
    );

-- =====================================================
-- Test A: assigned contractor CAN update status on target rows
-- =====================================================
BEGIN;
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000201', true);
SET LOCAL ROLE authenticated;

DO $$
DECLARE
    v_count integer;
BEGIN
    UPDATE public.maintenance_requests
    SET status = 'in_progress'
    WHERE id = '00000000-0000-0000-0000-000000000701';

    GET DIAGNOSTICS v_count = ROW_COUNT;
    IF v_count <> 1 THEN
        RAISE EXCEPTION 'FAIL: assigned contractor should update maintenance_requests status (row_count=%)', v_count;
    END IF;
END $$;

DO $$
DECLARE
    v_count integer;
BEGIN
    UPDATE public.rehab_scopes
    SET status = 'in_progress'
    WHERE id = '00000000-0000-0000-0000-000000000801';

    GET DIAGNOSTICS v_count = ROW_COUNT;
    IF v_count <> 1 THEN
        RAISE EXCEPTION 'FAIL: assigned contractor should update rehab_scopes status (row_count=%)', v_count;
    END IF;
END $$;
ROLLBACK;

-- =========================================================
-- Test B: non-assigned contractor CANNOT update status rows
-- =========================================================
BEGIN;
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000201', true);
SET LOCAL ROLE authenticated;

DO $$
DECLARE
    v_count integer;
BEGIN
    UPDATE public.maintenance_requests
    SET status = 'completed'
    WHERE id = '00000000-0000-0000-0000-000000000702';

    GET DIAGNOSTICS v_count = ROW_COUNT;
    IF v_count <> 0 THEN
        RAISE EXCEPTION 'FAIL: non-assigned contractor should not update maintenance_requests status (row_count=%)', v_count;
    END IF;
END $$;

DO $$
DECLARE
    v_count integer;
BEGIN
    UPDATE public.rehab_scopes
    SET status = 'completed'
    WHERE id = '00000000-0000-0000-0000-000000000802';

    GET DIAGNOSTICS v_count = ROW_COUNT;
    IF v_count <> 0 THEN
        RAISE EXCEPTION 'FAIL: non-assigned contractor should not update rehab_scopes status (row_count=%)', v_count;
    END IF;
END $$;
ROLLBACK;

-- =====================================================================
-- Test C: assigned contractor still CANNOT update non-status fields only
-- =====================================================================
BEGIN;
SELECT set_config('request.jwt.claim.role', 'authenticated', true);
SELECT set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000201', true);
SET LOCAL ROLE authenticated;

DO $$
BEGIN
    BEGIN
        UPDATE public.maintenance_requests
        SET description = 'Illegal contractor description update'
        WHERE id = '00000000-0000-0000-0000-000000000701';

        RAISE EXCEPTION 'FAIL: contractor should not update maintenance_requests description';
    EXCEPTION
        WHEN insufficient_privilege THEN
            RAISE NOTICE 'PASS: maintenance_requests non-status update denied for contractor';
        WHEN others THEN
            IF SQLSTATE = '42501' THEN
                RAISE NOTICE 'PASS: maintenance_requests non-status update denied for contractor';
            ELSE
                RAISE;
            END IF;
    END;
END $$;

DO $$
BEGIN
    BEGIN
        UPDATE public.rehab_scopes
        SET description = 'Illegal contractor scope description update'
        WHERE id = '00000000-0000-0000-0000-000000000801';

        RAISE EXCEPTION 'FAIL: contractor should not update rehab_scopes description';
    EXCEPTION
        WHEN insufficient_privilege THEN
            RAISE NOTICE 'PASS: rehab_scopes non-status update denied for contractor';
        WHEN others THEN
            IF SQLSTATE = '42501' THEN
                RAISE NOTICE 'PASS: rehab_scopes non-status update denied for contractor';
            ELSE
                RAISE;
            END IF;
    END;
END $$;
ROLLBACK;

SELECT 'PASS: phase-2b contractor verification completed' AS result;
