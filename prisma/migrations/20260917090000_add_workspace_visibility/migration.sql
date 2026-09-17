DO $$ BEGIN
  CREATE TYPE "WorkspaceVisibility" AS ENUM ('PERSONAL', 'TEAM', 'PUBLIC');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
ALTER TABLE "workspaces" ADD COLUMN IF NOT EXISTS "visibility" "WorkspaceVisibility" NOT NULL DEFAULT 'TEAM';
