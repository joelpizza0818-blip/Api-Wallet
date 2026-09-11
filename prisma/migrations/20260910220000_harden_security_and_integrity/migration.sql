-- AlterTable
ALTER TABLE "api_keys" ADD COLUMN IF NOT EXISTS "encryptedValue" TEXT NOT NULL DEFAULT '';
ALTER TABLE "api_keys" ADD COLUMN IF NOT EXISTS "encryptionKeyVersion" INTEGER NOT NULL DEFAULT 1;

-- Create partial unique index to guarantee only one default environment per project
CREATE UNIQUE INDEX IF NOT EXISTS "unique_default_environment_per_project" 
ON "environments" ("projectId") 
WHERE "isDefault" = true;

-- Add check constraint to guarantee Flow target integrity (COLLECTION vs REQUEST)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'check_flow_target_integrity'
  ) THEN
    ALTER TABLE "flows" 
    ADD CONSTRAINT "check_flow_target_integrity" 
    CHECK (
      ("targetType" = 'COLLECTION' AND "collectionId" IS NOT NULL AND "requestId" IS NULL) OR 
      ("targetType" = 'REQUEST' AND "requestId" IS NOT NULL AND "collectionId" IS NULL)
    );
  END IF;
END $$;
