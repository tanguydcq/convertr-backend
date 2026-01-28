#!/bin/bash
set -e

echo "🚀 Starting Database Setup (Clean Install)..."

echo "1️⃣  Cleaning up existing schemas..."
npx prisma db execute --file ./prisma/migrations/cleanup.sql --schema ./prisma/schema.prisma

echo "2️⃣  Initializing Roles..."
npx prisma db execute --file ./prisma/migrations/00_init_roles.sql --schema ./prisma/schema.prisma

echo "3️⃣  Running Prisma Migrations (Creating Tables)..."
# Using interactive allow prompts if needed, but in new env with cleanup it should proceed to create init migration
npx prisma migrate dev --name init_multi_tenant_schema

echo "4️⃣  Applying Permissions..."
npx prisma db execute --file ./prisma/migrations/02_grant_permissions.sql --schema ./prisma/schema.prisma

echo "5️⃣  Applying RLS Policies..."
npx prisma db execute --file ./prisma/migrations/01_rls_policies.sql --schema ./prisma/schema.prisma

echo "6️⃣  Seeding Database..."
npx prisma db seed

echo "✅ Database Setup and Seeding Complete!"
