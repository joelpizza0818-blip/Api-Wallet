-- AlterTable
ALTER TABLE "collections" ADD COLUMN     "parentId" TEXT;

-- CreateIndex
CREATE INDEX "collections_parentId_idx" ON "collections"("parentId");

-- AddForeignKey
ALTER TABLE "collections" ADD CONSTRAINT "collections_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "collections"("id") ON DELETE CASCADE ON UPDATE CASCADE;
