CREATE TABLE "datasets" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "columns" JSONB NOT NULL DEFAULT '[]',
    "rows" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "datasets_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "datasets_projectId_name_key" ON "datasets"("projectId", "name");
CREATE INDEX "datasets_projectId_updatedAt_idx" ON "datasets"("projectId", "updatedAt");

ALTER TABLE "datasets" ADD CONSTRAINT "datasets_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;