-- Add the workspace invitation code expected by the current Prisma schema.
ALTER TABLE "workspaces" ADD COLUMN "inviteCode" TEXT;

CREATE UNIQUE INDEX "workspaces_inviteCode_key" ON "workspaces"("inviteCode");
