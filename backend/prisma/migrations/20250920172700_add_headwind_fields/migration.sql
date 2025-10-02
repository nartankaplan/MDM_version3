/*
  Warnings:

  - You are about to drop the `enrollment_tokens` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropIndex
DROP INDEX "enrollment_tokens_token_key";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "enrollment_tokens";
PRAGMA foreign_keys=on;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_devices" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "brand" TEXT,
    "osVersion" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OFFLINE',
    "battery" INTEGER,
    "location" TEXT,
    "imei" TEXT NOT NULL,
    "phoneNumber" TEXT,
    "macAddress" TEXT,
    "serialNumber" TEXT,
    "lastSeen" DATETIME,
    "isEnrolled" BOOLEAN NOT NULL DEFAULT false,
    "enrollmentDate" DATETIME,
    "deviceId" TEXT,
    "project" TEXT,
    "cpu" TEXT,
    "iccid" TEXT,
    "imsi" TEXT,
    "phone2" TEXT,
    "imei2" TEXT,
    "iccid2" TEXT,
    "imsi2" TEXT,
    "mdmMode" BOOLEAN NOT NULL DEFAULT false,
    "kioskMode" BOOLEAN NOT NULL DEFAULT false,
    "launcherType" TEXT,
    "launcherPackage" TEXT,
    "defaultLauncher" BOOLEAN NOT NULL DEFAULT false,
    "custom1" TEXT,
    "custom2" TEXT,
    "custom3" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "userId" INTEGER NOT NULL,
    CONSTRAINT "devices_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_devices" ("battery", "brand", "createdAt", "enrollmentDate", "id", "imei", "isEnrolled", "lastSeen", "location", "macAddress", "model", "name", "osVersion", "phoneNumber", "serialNumber", "status", "updatedAt", "userId") SELECT "battery", "brand", "createdAt", "enrollmentDate", "id", "imei", "isEnrolled", "lastSeen", "location", "macAddress", "model", "name", "osVersion", "phoneNumber", "serialNumber", "status", "updatedAt", "userId" FROM "devices";
DROP TABLE "devices";
ALTER TABLE "new_devices" RENAME TO "devices";
CREATE UNIQUE INDEX "devices_imei_key" ON "devices"("imei");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
