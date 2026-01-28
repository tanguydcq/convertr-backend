-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "ads";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "analytics";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "auth";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "crm";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "internal";

-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "secrets";

-- CreateEnum
CREATE TYPE "auth"."Role" AS ENUM ('OWNER', 'ADMIN', 'MEMBER');

-- CreateTable
CREATE TABLE "auth"."accounts" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth"."organisations" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "organisations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth"."memberships" (
    "id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "organisation_id" UUID NOT NULL,
    "role" "auth"."Role" NOT NULL DEFAULT 'MEMBER',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth"."auth_logs" (
    "id" UUID NOT NULL,
    "account_id" UUID NOT NULL,
    "action" TEXT NOT NULL,
    "metadata" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm"."leads" (
    "id" UUID NOT NULL,
    "organisation_id" UUID NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "company" TEXT,
    "budget" INTEGER,
    "score" INTEGER NOT NULL DEFAULT 0,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "status" TEXT NOT NULL DEFAULT 'NEW_LEAD',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm"."lead_status_history" (
    "id" UUID NOT NULL,
    "lead_id" UUID NOT NULL,
    "organisation_id" UUID NOT NULL,
    "status" TEXT NOT NULL,
    "changed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lead_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm"."calls" (
    "id" UUID NOT NULL,
    "lead_id" UUID NOT NULL,
    "organisation_id" UUID NOT NULL,
    "duration" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "calls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm"."call_transcripts" (
    "id" UUID NOT NULL,
    "call_id" UUID NOT NULL,
    "organisation_id" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "call_transcripts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crm"."appointments" (
    "id" UUID NOT NULL,
    "lead_id" UUID NOT NULL,
    "organisation_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "scheduled_at" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ads"."ad_accounts" (
    "id" UUID NOT NULL,
    "organisation_id" UUID NOT NULL,
    "platform_id" UUID NOT NULL,
    "external_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ad_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ads"."platforms" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "platforms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ads"."campaigns" (
    "id" UUID NOT NULL,
    "organisation_id" UUID NOT NULL,
    "ad_account_id" UUID NOT NULL,
    "external_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "budget" DECIMAL(65,30),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "campaigns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "secrets"."credentials" (
    "id" UUID NOT NULL,
    "organisation_id" UUID NOT NULL,
    "provider" TEXT NOT NULL,
    "encrypted_data" BYTEA NOT NULL,
    "key_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "credentials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "internal"."system_logs" (
    "id" UUID NOT NULL,
    "level" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "context" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "system_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "internal"."ia_prompts" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "template" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ia_prompts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "internal"."scoring_models" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "config" JSONB NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scoring_models_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "internal"."feature_flags" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "is_enabled" BOOLEAN NOT NULL DEFAULT false,
    "rules" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feature_flags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analytics"."events" (
    "id" UUID NOT NULL,
    "organisation_id" UUID NOT NULL,
    "event_type" TEXT NOT NULL,
    "properties" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analytics"."daily_kpis" (
    "id" UUID NOT NULL,
    "organisation_id" UUID NOT NULL,
    "date" DATE NOT NULL,
    "metric" TEXT NOT NULL,
    "value" DECIMAL(65,30) NOT NULL,

    CONSTRAINT "daily_kpis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analytics"."funnel_metrics" (
    "id" UUID NOT NULL,
    "organisation_id" UUID NOT NULL,
    "step_name" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "date" DATE NOT NULL,

    CONSTRAINT "funnel_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "accounts_email_key" ON "auth"."accounts"("email");

-- CreateIndex
CREATE UNIQUE INDEX "organisations_slug_key" ON "auth"."organisations"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "memberships_account_id_organisation_id_key" ON "auth"."memberships"("account_id", "organisation_id");

-- CreateIndex
CREATE INDEX "auth_logs_account_id_idx" ON "auth"."auth_logs"("account_id");

-- CreateIndex
CREATE INDEX "leads_organisation_id_idx" ON "crm"."leads"("organisation_id");

-- CreateIndex
CREATE INDEX "leads_status_idx" ON "crm"."leads"("status");

-- CreateIndex
CREATE INDEX "lead_status_history_lead_id_idx" ON "crm"."lead_status_history"("lead_id");

-- CreateIndex
CREATE INDEX "calls_organisation_id_idx" ON "crm"."calls"("organisation_id");

-- CreateIndex
CREATE UNIQUE INDEX "call_transcripts_call_id_key" ON "crm"."call_transcripts"("call_id");

-- CreateIndex
CREATE INDEX "appointments_organisation_id_idx" ON "crm"."appointments"("organisation_id");

-- CreateIndex
CREATE INDEX "ad_accounts_organisation_id_idx" ON "ads"."ad_accounts"("organisation_id");

-- CreateIndex
CREATE UNIQUE INDEX "ad_accounts_platform_id_external_id_key" ON "ads"."ad_accounts"("platform_id", "external_id");

-- CreateIndex
CREATE UNIQUE INDEX "platforms_name_key" ON "ads"."platforms"("name");

-- CreateIndex
CREATE INDEX "campaigns_organisation_id_idx" ON "ads"."campaigns"("organisation_id");

-- CreateIndex
CREATE UNIQUE INDEX "campaigns_ad_account_id_external_id_key" ON "ads"."campaigns"("ad_account_id", "external_id");

-- CreateIndex
CREATE INDEX "credentials_organisation_id_idx" ON "secrets"."credentials"("organisation_id");

-- CreateIndex
CREATE UNIQUE INDEX "ia_prompts_name_key" ON "internal"."ia_prompts"("name");

-- CreateIndex
CREATE UNIQUE INDEX "feature_flags_key_key" ON "internal"."feature_flags"("key");

-- CreateIndex
CREATE INDEX "events_organisation_id_created_at_idx" ON "analytics"."events"("organisation_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "daily_kpis_organisation_id_date_metric_key" ON "analytics"."daily_kpis"("organisation_id", "date", "metric");

-- CreateIndex
CREATE INDEX "funnel_metrics_organisation_id_date_idx" ON "analytics"."funnel_metrics"("organisation_id", "date");

-- AddForeignKey
ALTER TABLE "auth"."memberships" ADD CONSTRAINT "memberships_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "auth"."accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth"."memberships" ADD CONSTRAINT "memberships_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "auth"."organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth"."auth_logs" ADD CONSTRAINT "auth_logs_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "auth"."accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."leads" ADD CONSTRAINT "leads_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "auth"."organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."lead_status_history" ADD CONSTRAINT "lead_status_history_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "crm"."leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."calls" ADD CONSTRAINT "calls_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "crm"."leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."call_transcripts" ADD CONSTRAINT "call_transcripts_call_id_fkey" FOREIGN KEY ("call_id") REFERENCES "crm"."calls"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "crm"."appointments" ADD CONSTRAINT "appointments_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "crm"."leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ads"."ad_accounts" ADD CONSTRAINT "ad_accounts_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "auth"."organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ads"."ad_accounts" ADD CONSTRAINT "ad_accounts_platform_id_fkey" FOREIGN KEY ("platform_id") REFERENCES "ads"."platforms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ads"."campaigns" ADD CONSTRAINT "campaigns_organisation_id_fkey" FOREIGN KEY ("organisation_id") REFERENCES "auth"."organisations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ads"."campaigns" ADD CONSTRAINT "campaigns_ad_account_id_fkey" FOREIGN KEY ("ad_account_id") REFERENCES "ads"."ad_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
