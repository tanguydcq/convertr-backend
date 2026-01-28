-- 01_rls_policies.sql

-- Enable RLS on specific tables in CRM schema
ALTER TABLE crm.leads ENABLE ROW LEVEL SECURITY;

ALTER TABLE crm.lead_status_history ENABLE ROW LEVEL SECURITY;

ALTER TABLE crm.calls ENABLE ROW LEVEL SECURITY;

ALTER TABLE crm.appointments ENABLE ROW LEVEL SECURITY;

-- Note: call_transcripts is linked to calls, so we can rely on join security or add org_id there too.
-- In our schema, we added organisation_id to call_transcripts for easier RLS.
ALTER TABLE crm.call_transcripts ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- Policies for app_client
-- -----------------------------------------------------------------------------

-- LEADS
CREATE POLICY "Tenant Isolation: LEADS" ON crm.leads FOR ALL TO app_client USING (
    organisation_id = current_setting('app.org_id', true)::uuid
)
WITH
    CHECK (
        organisation_id = current_setting('app.org_id', true)::uuid
    );

-- LEAD STATUS HISTORY
CREATE POLICY "Tenant Isolation: LEAD_STATUS_HISTORY" ON crm.lead_status_history FOR ALL TO app_client USING (
    organisation_id = current_setting('app.org_id', true)::uuid
)
WITH
    CHECK (
        organisation_id = current_setting('app.org_id', true)::uuid
    );

-- CALLS
CREATE POLICY "Tenant Isolation: CALLS" ON crm.calls FOR ALL TO app_client USING (
    organisation_id = current_setting('app.org_id', true)::uuid
)
WITH
    CHECK (
        organisation_id = current_setting('app.org_id', true)::uuid
    );

-- APPOINTMENTS
CREATE POLICY "Tenant Isolation: APPOINTMENTS" ON crm.appointments FOR ALL TO app_client USING (
    organisation_id = current_setting('app.org_id', true)::uuid
)
WITH
    CHECK (
        organisation_id = current_setting('app.org_id', true)::uuid
    );

-- CALL TRANSCRIPTS
CREATE POLICY "Tenant Isolation: CALL_TRANSCRIPTS" ON crm.call_transcripts FOR ALL TO app_client USING (
    organisation_id = current_setting('app.org_id', true)::uuid
)
WITH
    CHECK (
        organisation_id = current_setting('app.org_id', true)::uuid
    );

-- -----------------------------------------------------------------------------
-- Policies for app_internal (Workers/Admin)
-- Internal services usually bypass RLS or have a "bypass rls" attribute,
-- but if they connect as a role that has RLS enabled, they need a policy too.
-- Here we assume app_internal is trusted or we give them a permissive policy.
-- -----------------------------------------------------------------------------

CREATE POLICY "Internal Access: LEADS" ON crm.leads FOR ALL TO app_internal USING (true)
WITH
    CHECK (true);

CREATE POLICY "Internal Access: HISTORY" ON crm.lead_status_history FOR ALL TO app_internal USING (true)
WITH
    CHECK (true);

CREATE POLICY "Internal Access: CALLS" ON crm.calls FOR ALL TO app_internal USING (true)
WITH
    CHECK (true);

CREATE POLICY "Internal Access: APPOINTMENTS" ON crm.appointments FOR ALL TO app_internal USING (true)
WITH
    CHECK (true);

CREATE POLICY "Internal Access: TRANSCRIPTS" ON crm.call_transcripts FOR ALL TO app_internal USING (true)
WITH
    CHECK (true);