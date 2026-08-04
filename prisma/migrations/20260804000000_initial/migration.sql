CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'TECHNICIAN', 'REVIEWER', 'APPROVER');
CREATE TYPE "CalibrationStatus" AS ENUM ('DRAFT', 'UNDER_REVIEW', 'CONFIRMED', 'POSTPONED', 'COMPLETED');

CREATE TABLE "User" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "role" "UserRole" NOT NULL DEFAULT 'TECHNICIAN',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Company" (
  "id" TEXT NOT NULL, "name" TEXT NOT NULL, "address" TEXT, "phone" TEXT, "email" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InstrumentForm" (
  "id" TEXT NOT NULL, "code" TEXT NOT NULL, "name" TEXT NOT NULL, "revision" TEXT NOT NULL,
  "description" TEXT, "templateFilePath" TEXT NOT NULL, "schemaJson" JSONB NOT NULL,
  "mappingJson" JSONB NOT NULL, "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "InstrumentForm_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CalibrationRecord" (
  "id" TEXT NOT NULL, "recordNumber" TEXT NOT NULL, "certificateNumber" TEXT,
  "instrumentFormId" TEXT NOT NULL, "companyId" TEXT NOT NULL,
  "status" "CalibrationStatus" NOT NULL DEFAULT 'DRAFT', "formDataJson" JSONB NOT NULL,
  "generatedFilePath" TEXT, "createdById" TEXT NOT NULL, "reviewedById" TEXT, "approvedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CalibrationRecord_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CalibrationRevision" (
  "id" TEXT NOT NULL, "calibrationRecordId" TEXT NOT NULL, "revisionNumber" INTEGER NOT NULL,
  "formDataJson" JSONB NOT NULL, "changedById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CalibrationRevision_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "Company_name_idx" ON "Company"("name");
CREATE UNIQUE INDEX "InstrumentForm_code_revision_key" ON "InstrumentForm"("code", "revision");
CREATE INDEX "InstrumentForm_isActive_name_idx" ON "InstrumentForm"("isActive", "name");
CREATE UNIQUE INDEX "CalibrationRecord_recordNumber_key" ON "CalibrationRecord"("recordNumber");
CREATE INDEX "CalibrationRecord_status_updatedAt_idx" ON "CalibrationRecord"("status", "updatedAt");
CREATE INDEX "CalibrationRecord_instrumentFormId_idx" ON "CalibrationRecord"("instrumentFormId");
CREATE INDEX "CalibrationRecord_companyId_idx" ON "CalibrationRecord"("companyId");
CREATE UNIQUE INDEX "CalibrationRevision_calibrationRecordId_revisionNumber_key" ON "CalibrationRevision"("calibrationRecordId", "revisionNumber");
CREATE INDEX "CalibrationRevision_changedById_idx" ON "CalibrationRevision"("changedById");

ALTER TABLE "CalibrationRecord" ADD CONSTRAINT "CalibrationRecord_instrumentFormId_fkey" FOREIGN KEY ("instrumentFormId") REFERENCES "InstrumentForm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CalibrationRecord" ADD CONSTRAINT "CalibrationRecord_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CalibrationRecord" ADD CONSTRAINT "CalibrationRecord_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CalibrationRecord" ADD CONSTRAINT "CalibrationRecord_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CalibrationRecord" ADD CONSTRAINT "CalibrationRecord_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CalibrationRevision" ADD CONSTRAINT "CalibrationRevision_calibrationRecordId_fkey" FOREIGN KEY ("calibrationRecordId") REFERENCES "CalibrationRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CalibrationRevision" ADD CONSTRAINT "CalibrationRevision_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
