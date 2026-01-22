-- CreateTable
CREATE TABLE "external_credentials" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenant_id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "encrypted_payload" BLOB NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "rotated_at" DATETIME
);

-- CreateIndex
CREATE UNIQUE INDEX "external_credentials_tenant_id_provider_key" ON "external_credentials"("tenant_id", "provider");
