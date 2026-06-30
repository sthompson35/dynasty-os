param(
    [string]$ProjectDir = "c:\dynasty_property_os\dynasty_propertyos_supabase_blender"
)

$ErrorActionPreference = "Stop"

function Invoke-DbQuery {
    param(
        [string]$Name,
        [string]$Sql
    )

    Write-Host "`n==> $Name"
    & supabase --workdir $ProjectDir db query --local $Sql
    if ($LASTEXITCODE -ne 0) {
        throw "Step failed: $Name"
    }
}

$steps = @(
    @{
        Name = "Seed cleanup"
        Sql = @"
DELETE FROM public.maintenance_requests WHERE id IN ('00000000-0000-0000-0000-000000000701','00000000-0000-0000-0000-000000000702');
"@
    },
    @{
        Name = "Seed cleanup rehab scopes"
        Sql = @"
DELETE FROM public.rehab_scopes WHERE id IN ('00000000-0000-0000-0000-000000000801','00000000-0000-0000-0000-000000000802');
"@
    },
    @{
        Name = "Seed cleanup rehab project"
        Sql = @"
DELETE FROM public.rehab_projects WHERE id = '00000000-0000-0000-0000-000000000601';
"@
    },
    @{
        Name = "Seed cleanup property"
        Sql = @"
DELETE FROM public.properties WHERE id = '00000000-0000-0000-0000-000000000501';
"@
    },
    @{
        Name = "Seed cleanup contractors"
        Sql = @"
DELETE FROM public.contractors WHERE id IN ('00000000-0000-0000-0000-000000000401','00000000-0000-0000-0000-000000000402');
"@
    },
    @{
        Name = "Seed cleanup app users"
        Sql = @"
DELETE FROM public.app_users WHERE id IN ('00000000-0000-0000-0000-000000000301','00000000-0000-0000-0000-000000000302','00000000-0000-0000-0000-000000000303');
"@
    },
    @{
        Name = "Seed cleanup organization"
        Sql = @"
DELETE FROM public.organizations WHERE id = '00000000-0000-0000-0000-000000000111';
"@
    },
    @{
        Name = "Seed organization"
        Sql = @"
INSERT INTO public.organizations (id, name)
VALUES ('00000000-0000-0000-0000-000000000111', 'RLS Verify Org')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name;
"@
    },
    @{
        Name = "Seed app users"
        Sql = @"
INSERT INTO public.app_users (id, auth_user_id, organization_id, full_name, email, role)
VALUES
('00000000-0000-0000-0000-000000000301','00000000-0000-0000-0000-000000000201','00000000-0000-0000-0000-000000000111','Contractor Alpha User','contractor.alpha@example.com','contractor'),
('00000000-0000-0000-0000-000000000302','00000000-0000-0000-0000-000000000202','00000000-0000-0000-0000-000000000111','Contractor Beta User','contractor.beta@example.com','contractor'),
('00000000-0000-0000-0000-000000000303','00000000-0000-0000-0000-000000000203','00000000-0000-0000-0000-000000000111','Owner Verify User','owner.verify@example.com','owner')
ON CONFLICT (id) DO UPDATE
SET auth_user_id = EXCLUDED.auth_user_id,
    organization_id = EXCLUDED.organization_id,
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    role = EXCLUDED.role;
"@
    },
    @{
        Name = "Seed contractors"
        Sql = @"
INSERT INTO public.contractors (id, organization_id, company_name, contact_name, email)
VALUES
('00000000-0000-0000-0000-000000000401','00000000-0000-0000-0000-000000000111','Alpha Contracting LLC','Contractor Alpha User','contractor.alpha@example.com'),
('00000000-0000-0000-0000-000000000402','00000000-0000-0000-0000-000000000111','Beta Contracting LLC','Contractor Beta User','contractor.beta@example.com')
ON CONFLICT (id) DO UPDATE
SET organization_id = EXCLUDED.organization_id,
    company_name = EXCLUDED.company_name,
    contact_name = EXCLUDED.contact_name,
    email = EXCLUDED.email;
"@
    },
    @{
        Name = "Seed property"
        Sql = @"
INSERT INTO public.properties (id, organization_id, property_code, address)
VALUES ('00000000-0000-0000-0000-000000000501','00000000-0000-0000-0000-000000000111','RLS-VERIFY-001','101 Verification Way')
ON CONFLICT (id) DO UPDATE
SET organization_id = EXCLUDED.organization_id,
    property_code = EXCLUDED.property_code,
    address = EXCLUDED.address;
"@
    },
    @{
        Name = "Seed rehab project"
        Sql = @"
INSERT INTO public.rehab_projects (id, property_id, project_name, status)
VALUES ('00000000-0000-0000-0000-000000000601','00000000-0000-0000-0000-000000000501','Verification Rehab Project','planning')
ON CONFLICT (id) DO UPDATE
SET property_id = EXCLUDED.property_id,
    project_name = EXCLUDED.project_name,
    status = EXCLUDED.status;
"@
    },
    @{
        Name = "Seed maintenance requests"
        Sql = @"
INSERT INTO public.maintenance_requests (id, property_id, request_title, description, priority, status, assigned_contractor_id)
VALUES
('00000000-0000-0000-0000-000000000701','00000000-0000-0000-0000-000000000501','MR Assigned to Alpha','Keep original description alpha','normal','open','00000000-0000-0000-0000-000000000401'),
('00000000-0000-0000-0000-000000000702','00000000-0000-0000-0000-000000000501','MR Assigned to Beta','Keep original description beta','normal','open','00000000-0000-0000-0000-000000000402')
ON CONFLICT (id) DO UPDATE
SET property_id = EXCLUDED.property_id,
    request_title = EXCLUDED.request_title,
    description = EXCLUDED.description,
    priority = EXCLUDED.priority,
    status = EXCLUDED.status,
    assigned_contractor_id = EXCLUDED.assigned_contractor_id;
"@
    },
    @{
        Name = "Seed rehab scopes"
        Sql = @"
INSERT INTO public.rehab_scopes (id, rehab_project_id, category, scope_item, description, priority, status, assigned_contractor_id)
VALUES
('00000000-0000-0000-0000-000000000801','00000000-0000-0000-0000-000000000601','plumbing','Replace shutoff valve alpha','Keep original scope description alpha','normal','not_started','00000000-0000-0000-0000-000000000401'),
('00000000-0000-0000-0000-000000000802','00000000-0000-0000-0000-000000000601','electrical','Upgrade breaker beta','Keep original scope description beta','normal','not_started','00000000-0000-0000-0000-000000000402')
ON CONFLICT (id) DO UPDATE
SET rehab_project_id = EXCLUDED.rehab_project_id,
    category = EXCLUDED.category,
    scope_item = EXCLUDED.scope_item,
    description = EXCLUDED.description,
    priority = EXCLUDED.priority,
    status = EXCLUDED.status,
    assigned_contractor_id = EXCLUDED.assigned_contractor_id;
"@
    },
    @{
        Name = "Check assigned contractor can update maintenance request status"
        Sql = @'
DO $$
DECLARE
    v_count integer;
BEGIN
    PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
    PERFORM set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000201', true);
    EXECUTE 'SET LOCAL ROLE authenticated';

    UPDATE public.maintenance_requests
    SET status = 'in_progress'
    WHERE id = '00000000-0000-0000-0000-000000000701';

    GET DIAGNOSTICS v_count = ROW_COUNT;
    IF v_count <> 1 THEN
        RAISE EXCEPTION 'FAIL: assigned contractor should update maintenance request status (row_count=%)', v_count;
    END IF;

    UPDATE public.maintenance_requests
    SET status = 'open'
    WHERE id = '00000000-0000-0000-0000-000000000701';
END
$$;
'@
    },
    @{
        Name = "Check assigned contractor can update rehab scope status"
        Sql = @'
DO $$
DECLARE
    v_count integer;
BEGIN
    PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
    PERFORM set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000201', true);
    EXECUTE 'SET LOCAL ROLE authenticated';

    UPDATE public.rehab_scopes
    SET status = 'in_progress'
    WHERE id = '00000000-0000-0000-0000-000000000801';

    GET DIAGNOSTICS v_count = ROW_COUNT;
    IF v_count <> 1 THEN
        RAISE EXCEPTION 'FAIL: assigned contractor should update rehab scope status (row_count=%)', v_count;
    END IF;

    UPDATE public.rehab_scopes
    SET status = 'not_started'
    WHERE id = '00000000-0000-0000-0000-000000000801';
END
$$;
'@
    },
    @{
        Name = "Check non-assigned contractor denied on maintenance request status"
        Sql = @'
DO $$
DECLARE
    v_count integer;
BEGIN
    PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
    PERFORM set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000201', true);
    EXECUTE 'SET LOCAL ROLE authenticated';

    UPDATE public.maintenance_requests
    SET status = 'completed'
    WHERE id = '00000000-0000-0000-0000-000000000702';

    GET DIAGNOSTICS v_count = ROW_COUNT;
    IF v_count <> 0 THEN
        RAISE EXCEPTION 'FAIL: non-assigned contractor should not update maintenance request status (row_count=%)', v_count;
    END IF;
END
$$;
'@
    },
    @{
        Name = "Check non-assigned contractor denied on rehab scope status"
        Sql = @'
DO $$
DECLARE
    v_count integer;
BEGIN
    PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
    PERFORM set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000201', true);
    EXECUTE 'SET LOCAL ROLE authenticated';

    UPDATE public.rehab_scopes
    SET status = 'completed'
    WHERE id = '00000000-0000-0000-0000-000000000802';

    GET DIAGNOSTICS v_count = ROW_COUNT;
    IF v_count <> 0 THEN
        RAISE EXCEPTION 'FAIL: non-assigned contractor should not update rehab scope status (row_count=%)', v_count;
    END IF;
END
$$;
'@
    },
    @{
        Name = "Check assigned contractor denied on maintenance request non-status update"
        Sql = @'
DO $$
BEGIN
    PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
    PERFORM set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000201', true);
    EXECUTE 'SET LOCAL ROLE authenticated';

    BEGIN
        UPDATE public.maintenance_requests
        SET description = 'illegal description change'
        WHERE id = '00000000-0000-0000-0000-000000000701';

        RAISE EXCEPTION 'FAIL: contractor unexpectedly changed maintenance request non-status field';
    EXCEPTION
        WHEN others THEN
            IF SQLSTATE <> '42501' THEN
                RAISE;
            END IF;
    END;
END
$$;
'@
    },
    @{
        Name = "Check assigned contractor denied on rehab scope non-status update"
        Sql = @'
DO $$
BEGIN
    PERFORM set_config('request.jwt.claim.role', 'authenticated', true);
    PERFORM set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000201', true);
    EXECUTE 'SET LOCAL ROLE authenticated';

    BEGIN
        UPDATE public.rehab_scopes
        SET description = 'illegal scope description change'
        WHERE id = '00000000-0000-0000-0000-000000000801';

        RAISE EXCEPTION 'FAIL: contractor unexpectedly changed rehab scope non-status field';
    EXCEPTION
        WHEN others THEN
            IF SQLSTATE <> '42501' THEN
                RAISE;
            END IF;
    END;
END
$$;
'@
    }
)

foreach ($step in $steps) {
    Invoke-DbQuery -Name $step.Name -Sql $step.Sql
}

Write-Host "`nPASS: Phase-2b contractor RLS verification completed." -ForegroundColor Green
