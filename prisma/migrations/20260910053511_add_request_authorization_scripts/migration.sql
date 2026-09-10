-- AlterTable
ALTER TABLE "api_requests" ADD COLUMN     "authorization" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "preRequestScript" TEXT,
ADD COLUMN     "testScript" TEXT;

-- AlterTable
ALTER TABLE "collections" ADD COLUMN     "authorization" JSONB NOT NULL DEFAULT '{}';
