-- Add the workspace invitation code expected by the current Prisma schema.
ALTER TABLE "workspaces" ADD COLUMN IF NOT EXISTS "inviteCode" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "workspaces_inviteCode_key" ON "workspaces"("inviteCode");
