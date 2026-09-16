-- AlterTable
ALTER TABLE "Resource" ADD COLUMN "body" TEXT;

-- AlterTable
ALTER TABLE "Note" ADD COLUMN "anchor" JSONB;
