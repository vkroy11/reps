-- Moves the device id off User and into its own table.
--
-- Hand-written rather than generated, because the generated version drops
-- User.deviceId and with it every existing learner's identity. The Device rows
-- are populated from the column *before* it is dropped, so anyone already
-- using the app keeps their paths, notes and practice history.

-- CreateTable
CREATE TABLE "Device" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Device_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Device_userId_idx" ON "Device"("userId");

-- AddForeignKey
ALTER TABLE "Device" ADD CONSTRAINT "Device_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Carry every existing identity across. This is the whole reason the migration
-- is not the generated one.
INSERT INTO "Device" ("id", "userId", "createdAt")
SELECT "deviceId", "id", "createdAt" FROM "User";

-- AlterTable
DROP INDEX "User_deviceId_key";
ALTER TABLE "User" DROP COLUMN "deviceId",
ADD COLUMN     "email" TEXT,
ADD COLUMN     "name" TEXT;
