CREATE TABLE "email_login_challenges" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "email_login_challenges_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "auth_audit_events" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "email" TEXT,
    "event" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "auth_audit_events_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "email_login_challenges_tokenHash_key" ON "email_login_challenges"("tokenHash");
CREATE INDEX "email_login_challenges_userId_expiresAt_idx" ON "email_login_challenges"("userId", "expiresAt");
CREATE INDEX "auth_audit_events_email_createdAt_idx" ON "auth_audit_events"("email", "createdAt");
CREATE INDEX "auth_audit_events_userId_createdAt_idx" ON "auth_audit_events"("userId", "createdAt");
ALTER TABLE "email_login_challenges" ADD CONSTRAINT "email_login_challenges_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "auth_audit_events" ADD CONSTRAINT "auth_audit_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;